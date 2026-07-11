import { RACE_TRACKS } from '../src/game/raceTracks.js';
import {
  applyRaceHazardEffect,
  applyRaceTrackEvent,
  hazardCyclePhaseForTime,
  hazardWindowOpenForTime,
  resolveDroppedHazardContact,
  resolveDroppedRaceHazard,
  resolveRaceTrackEventsForFrame,
  resolveRaceTrackHazardContactsForFrame,
  trackHazardActiveForTime,
  triggerRaceHazardByType,
  triggerNearestRemoteHazard,
  updateDroppedHazardsForFrame,
} from '../src/game/raceHazards.js';
import {
  ITEM_DEFINITIONS,
  ITEM_COLORS,
  advanceHeldRaceItemAfterUse,
  applyBananaMagnetRivalPullForFrame,
  applyRaceItemBoxPickup,
  applyRaceItemSelfStatusUse,
  applyRaceItemUse,
  buyRaceDoubleSlotForPlayer,
  buyRareRacePickupForPlayer,
  chooseRaceBoxItem,
  collectRaceItemBoxForPlayer,
  createHeldRaceItem,
  getItemDefinition,
  itemAllowedOnTrack,
  resolveBananaScatterForRacer,
  resolveItemBoxPickupForFrame,
  resolveRaceItemBoostUse,
  resolveRaceItemOpponentUse,
  resolveRaceItemRemoteHazardUse,
  resolveRaceItemUseRequest,
  resolveRaceTrapItemUse,
  spendRaceBananasForPlayer,
  upgradeHeldRaceItemForPlayer,
  updateDroppedBananasForPlayer,
  updateTrackBananasForPlayer,
} from '../src/game/raceItems.js';
import {
  DRIFT_HOP_DURATION,
  STUCK_RECOVERY_TUNING,
  accelerationMultiplierForSpeed,
  applyGroundJumpForFrame,
  applyLateralGripForFrame,
  applyPlayerHitResponse,
  applyRoadAssistForFrame,
  applyPositionBoundsForFrame,
  applyPlayerTimersForFrame,
  applyRivalHitResponse,
  applySpeedCapForFrame,
  applyStuckRecovery,
  applyBoost,
  applyTrackBoundaryForFrame,
  applyVehicleModeChange,
  canActivateDrift,
  canStartDriftHop,
  driftChargeForFrame,
  driveForcesForFrame,
  headingDeltaForFrame,
  driftHopVelocityFor,
  driftReleaseForState,
  driftTierForCharge,
  nextVehicleModeFor,
  resolveFlightGateForFrame,
  resolvePlayerRivalBumpsForFrame,
  resolveVehicleIntegrationForFrame,
  resolveBoostPadForFrame,
  resolveWorldCircleCollision,
  resolveWorldCollisionContactsForFrame,
  speedCapsForState,
  steeringTurnInputForState,
  steeringTurnSpeedForState,
  surfaceOffroadForState,
  updateStuckRecoveryState,
} from '../src/game/race/physics/kartPhysics.js';
import {
  FLIGHT_ALTITUDE_LIMITS,
  VEHICLES,
  VEHICLE_ORDER,
} from '../src/game/race/physics/kartTuning.js';
import {
  applyCameraCollisionAvoidance,
  cameraCollisionCandidatesFor,
  cameraRollFor,
  resolveChaseCameraProfile,
  resolveRouteLookaheadTarget,
  updateChaseCameraFrame,
} from '../src/game/race/camera/chaseCamera.js';
import {
  ambientVoicesFor,
  createRaceAudioController,
  cueFrequencyFor,
  cueWaveTypeFor,
} from '../src/game/race/raceAudio.js';
import {
  applyBoostFlameGroupFrame,
  applyShieldGroupFrame,
  boostPadPresentationFrameFor,
  boostFlamePresentationFrameFor,
  droppedBananaPresentationFrameFor,
  driftSparkColorForTier,
  driftSparkFrameFor,
  driftSparkTierForCharge,
  driftTrailFrameFor,
  flightGatePresentationFrameFor,
  itemBoxPresentationFrameFor,
  playerVehiclePresentationFrameFor,
  rivalVehiclePresentationFrameFor,
  shieldPresentationFrameFor,
  switchRingFrameFor,
  switchPadPresentationFrameFor,
  trackBananaPresentationFrameFor,
  trackHazardPresentationFrameFor,
  trapPresentationFrameFor,
} from '../src/game/race/render/raceVfx.js';
import {
  createBasicMaterial,
  createVehicleModel,
} from '../src/game/race/render/createKartModel.js';
import {
  BILLBOARD_TEXT_STYLE,
  createBillboardText,
} from '../src/game/race/render/createBillboardText.js';
import {
  TRACK_THEME,
  createDefaultRaceCityDistricts,
} from '../src/game/race/render/raceSceneTheme.js';
import {
  RACE_CAMERA_FAR,
  RACE_FOG_FAR,
  RACE_FOG_NEAR,
  RACE_RENDERER_OPTIONS,
  RACE_RENDER_SCALE,
  createRaceRenderer,
  createRaceSceneShell,
  fitRaceRendererToCanvas,
} from '../src/game/race/render/createRaceScene.js';
import {
  createBoostPadMesh,
  createCleanCourseVisualSegments,
  createTrackMesh,
  createTrackRenderMaterials,
} from '../src/game/race/render/createTrackMesh.js';
import {
  createDroppedBananaMaterial,
  createDroppedBananaMesh,
  createDroppedTrapMesh,
  createFlightGateMesh,
  createItemBoxMesh,
  createRacePickupMeshes,
  createSwitchPadMesh,
  createTrackBananaMaterial,
  createTrackBananaMesh,
  createTrackHazardMesh,
} from '../src/game/race/render/createRacePickups.js';
import { createRaceScenery } from '../src/game/race/render/createRaceScenery.js';
import {
  createRaceVehicleMeshes,
  createRivalKartModel,
  createVehicleSwitchRing,
} from '../src/game/race/render/createRaceVehicles.js';
import { syncRaceMeshes } from '../src/game/race/render/syncRaceMeshes.js';
import {
  SHOULDER_WIDTH,
  TRACK_SCALE,
  compileTrack3D,
  layerAltitude,
  layerOffset,
  sampleCourseLine,
  toCourseV2Point,
  toWorldPoint,
} from '../src/game/race/track/trackGeometry.js';
import {
  BALLOON_TYPES,
  createRaceState,
} from '../src/game/race/raceState.js';
import {
  RACE_RELEVANT_KEY_CODES,
  applyRaceKeyDown,
  applyRaceKeyUp,
  applyRaceTouchPatch,
  consumeRaceKeyCommands,
  defaultRaceTouchControls,
  handleRaceCommand,
  processRaceCommandFrame,
  resolveRaceControls,
} from '../src/game/race/raceControls.js';
import {
  createRaceRuntimeSetup,
  defaultRaceVehicleFor,
} from '../src/game/race/raceRuntimeSetup.js';
import {
  AURORA,
  AVALANCHE,
  BLIZZARD,
  ITEM_KEYS,
  ITEM_LABELS,
  ITEM_FEEL,
  MARCH,
  SARDINE,
  SLAP_FISH,
  SNOWBALL,
  ageFishBones,
  createFishBoneField,
  dropBlizzard,
  dropFishBone,
  fishBoneHitFor,
  insideBlizzard,
  itemForPickup,
  marchHitFor,
  projectileHitFor,
  rivalItemActionAt,
  sardineTargetFor,
  slapFishHitsFor,
  startMarch,
  throwSardine,
  throwSnowball,
  updateBlizzards,
  updateMarch,
  updateProjectiles,
} from '../src/game/race/heldItems.js';
import {
  COIN_FEEL,
  COIN_ROWS,
  buildCoinField,
  coinSpeedMultiplier,
  coinsAfterSpin,
  collectCoinsForFrame,
  respawnCoins,
} from '../src/game/race/raceCoins.js';
import { createRaceCameraRuntime } from '../src/game/race/raceCameraRuntime.js';
import { createRaceMotionRuntime } from '../src/game/race/raceMotionRuntime.js';
import { createRaceRuntimeScene } from '../src/game/race/raceSceneRuntime.js';
import { createRaceUpdateRuntime } from '../src/game/race/raceUpdateRuntime.js';
import {
  VISUAL_KART_MANUAL_SCENARIOS,
  applyVisualKartScenarioFrame,
  manualVisualScenarioFlags,
  manualVisualScenarioIsActive,
  manualVisualScenarioIsPrimed,
  manualVisualScenarioPrimedKey,
  primeVisualKartScenario,
  resetKartPlayerForVisualScenario,
  steeringScenarioSpeedRatio,
  visualKartScenarioMatches,
  visualScenarioUsesHeadingCamera,
} from '../src/game/race/playtest/raceVisualScenarios.js';
import {
  createRacePlaytestState,
  publishRacePlaytestResult,
  recordRacePlaytestEvent,
  resetRacePlaytestGlobals,
} from '../src/game/race/playtest/racePlaytestState.js';
import { createRacePlaytestRuntime } from '../src/game/race/playtest/racePlaytestRuntime.js';
import { updateRaceAutoplayPlayer } from '../src/game/race/playtest/raceAutoplay.js';
import {
  activeSurfaceFor,
  createRaceTelemetryStats,
  normalizedSpeedFor,
  playerBoostBurstVisualActive,
  playerShieldBurstVisualActive,
  publishRaceTelemetryFrame,
  rendererInfoTelemetryFor,
} from '../src/game/race/raceTelemetry.js';
import {
  DEFAULT_RACE_TELEMETRY_INTERVAL_MS,
  createRaceTelemetryRuntime,
} from '../src/game/race/raceTelemetryRuntime.js';
import { createRaceTelemetryDiagnostics } from '../src/game/race/raceTelemetryDiagnostics.js';
import {
  applyLapProgress,
  applyRaceRankings,
  scoreRacer,
} from '../src/game/race/raceProgress.js';
import {
  chooseRaceRivalRouteLayer,
  maybeUseRivalSignature,
  rivalPressureForFrame,
  updateRaceRivalsForFrame,
} from '../src/game/race/raceRivals.js';
import {
  applyRaceTrackHazardEffectForFrame,
  applyRaceVehicleIntegrationForFrame,
  resolveRaceWorldCollisionsForFrame,
  runRaceTrackEventForFrame,
  triggerRaceHazardTypeForFrame,
  updateRaceRankingsForFrame,
  updateRaceTrackEventsForFrame,
  updateRaceTrackHazardsForFrame,
} from '../src/game/race/raceFrameUpdates.js';
import {
  advanceRaceFrameClock,
  recordRaceFramePhaseStats,
  resolveRaceFrameDelta,
  updateRaceFrameStats,
  updateRaceRuntimeTimers,
} from '../src/game/race/raceFrameClock.js';
import {
  buildRaceFinishResult,
  publishRaceFinishResult,
} from '../src/game/race/raceFinishRuntime.js';
import { updateRacePlayerForFrame } from '../src/game/race/racePlayerFrame.js';
import { createRaceRuntimeActions } from '../src/game/race/raceRuntimeActions.js';
import {
  createRaceDropRuntime,
  scatterDroppedRaceBananas,
  spawnDroppedRaceBanana,
  spawnDroppedRaceTrap,
} from '../src/game/race/raceDropRuntime.js';
import {
  applyPlayerHitRuntime,
  applyRivalHitRuntime,
  createRaceHitRuntime,
} from '../src/game/race/raceHitRuntime.js';
import {
  applyRaceBoostRuntime,
  applyRaceVehicleModeRuntime,
  createRaceVehicleRuntime,
} from '../src/game/race/raceVehicleRuntime.js';
// Shipped V2 kart runtime (ComebackCityThreeKartRace) rival sim — first
// pure-node coverage of that family: kart-vs-kart contact rules.
import {
  createRivalRacers,
  KART_CONTACT,
  updateRivalRacers,
} from '../src/game/race/rivalRacers.js';
// B2 palette moments (shipped V2 kart runtime): pure per-lap atmosphere
// lerp helpers — base fill, segment pick, smoothstep easing, and the
// 1.0 -> 0.0 lap wrap.
import {
  createMomentSample,
  resolveMoments,
  sampleMoments,
} from '../src/game/race/paletteMoments.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const REQUIRED_TRACKS = {
  'comeback-city': {
    bananaCount: 18,
    hazards: ['wet', 'pulseZone', 'laser', 'mineCart', 'gate'],
    itemBoxes: { ground: 8 },
    kartOnly: true,
    signature: 'boost',
  },
  'magnet-mine-descent': {
    bananaCount: 10,
    hazards: ['mineCart', 'magneticSpike', 'pulseZone', 'stalactite', 'polarityGate'],
    itemBoxes: { air: 3, ground: 5, hybrid: 2 },
    signature: 'polaritySwap',
  },
  'static-storm-plateau': {
    bananaCount: 10,
    hazards: ['lightning', 'tornado', 'bridgeCollapse', 'staticCharge', 'windGust'],
    itemBoxes: { air: 6, ground: 4, hybrid: 3 },
    signature: 'lightningRod',
  },
  'tide-pier': {
    bananaCount: 10,
    hazards: ['fishCart', 'laundry', 'lighthouseBeam', 'seagulls', 'crabTrap'],
    itemBoxes: { air: 4, ground: 6, hybrid: 2 },
    signature: 'anchorDrop',
  },
};

const REQUIRED_ITEM_CATEGORIES = ['projectile', 'trap', 'vehicle-state', 'environmental', 'setup', 'self-buff'];

const fail = (message, detail = {}) => {
  console.error(JSON.stringify({ detail, error: message }, null, 2));
  process.exit(1);
};

const progressInRange = (progress, start, end) =>
  start <= end ? progress >= start && progress <= end : progress >= start || progress <= end;

const courseDistance = (points, closed = true) => {
  let distance = 0;
  const limit = closed ? points.length : points.length - 1;
  for (let index = 0; index < limit; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    distance += Math.hypot((b.x || 0) - (a.x || 0), (b.z || b.y || 0) - (a.z || a.y || 0));
  }
  return distance;
};

const validateAssetManifest = async () => {
  const file = path.join(root, 'src/assets/game/asset-manifest.json');
  const entries = JSON.parse(await readFile(file, 'utf8'));
  if (!Array.isArray(entries) || entries.length < 3) fail('Asset manifest must list procedural and reference game assets', { entries });
  entries.forEach((entry) => {
    for (const key of ['filePath', 'source', 'license', 'role', 'sizeBudget', 'fallback']) {
      if (!entry[key]) fail('Asset manifest entry is incomplete', { entry, key });
    }
  });
};

const validateComebackCityV2 = (track) => {
  const course = track.courseV2;
  if (!course || course.version !== 'v2-authored-kart') fail('Comeback City must expose CourseV2Definition data', { version: course?.version });
  if (!track.kartOnly || !course.kartOnly) fail('Comeback City V2 must be kart-only', { courseKartOnly: course.kartOnly, trackKartOnly: track.kartOnly });
  if ((track.switchPads || []).length || (track.vehicleZones || []).length || (track.vehicleLocks || []).length) {
    fail('Comeback City V2 must not preserve vehicle switching hooks', {
      switchPads: track.switchPads?.length || 0,
      vehicleLocks: track.vehicleLocks?.length || 0,
      vehicleZones: track.vehicleZones?.length || 0,
    });
  }
  const mainWidths = (course.roadRibbons || []).filter((ribbon) => ribbon.role === 'main').map((ribbon) => ribbon.width);
  const badMain = mainWidths.filter((width) => width < 42 || width > 56);
  if (badMain.length || mainWidths.length < 5) fail('Main V2 roads must be authored at 42-56 world units', { badMain, mainWidths });
  const branchWidths = (course.branches || []).map((branch) => branch.width);
  if (branchWidths.length) fail('Comeback City proof track must stay branchless until the main lap is approved', { branchWidths });
  const loopLength = courseDistance(course.centerline, true);
  const bounds = course.centerline.reduce(
    (acc, point) => ({
      maxX: Math.max(acc.maxX, point.x),
      maxZ: Math.max(acc.maxZ, point.z),
      minX: Math.min(acc.minX, point.x),
      minZ: Math.min(acc.minZ, point.z),
    }),
    { maxX: -Infinity, maxZ: -Infinity, minX: Infinity, minZ: Infinity }
  );
  if (loopLength < 1250 || bounds.maxX - bounds.minX < 480 || bounds.maxZ - bounds.minZ < 420) {
    fail('Comeback City V2 course is too small for the authored city requirement', { bounds, loopLength });
  }
  for (const branch of course.branches || []) {
    if ((branch.leadSeconds || 0) < 2) fail('Branch entry signage must be visible at least 2 seconds before choice', branch);
    if (!Number.isFinite(branch.decisionCueProgress)) fail('Branch decision cue progress is missing', branch);
  }
  for (const key of ['surfaceZones', 'collisionZones', 'districtAnchors', 'minimapPath', 'cameraCheckpoints']) {
    if (!Array.isArray(course[key]) || !course[key].length) fail(`Comeback City V2 missing ${key}`, { key });
  }
};

const validateItems = () => {
  const categories = new Set(ITEM_DEFINITIONS.map((item) => item.category));
  const missingCategories = REQUIRED_ITEM_CATEGORIES.filter((category) => !categories.has(category));
  if (ITEM_DEFINITIONS.length < 12) fail('Expected at least 12 item definitions', { count: ITEM_DEFINITIONS.length });
  if (missingCategories.length) fail('Missing item categories', { missingCategories });

  ITEM_DEFINITIONS.forEach((item) => {
    if (!item.targetType || !item.vehicleRestriction || !item.trackRestriction) fail('Item schema incomplete', item);
    if (!Number.isFinite(item.duration) || !Number.isFinite(item.cooldown)) fail('Item timing schema incomplete', item);
    if (!item.feedback || !('activation' in item.feedback) || !('hit' in item.feedback) || !('expiration' in item.feedback)) {
      fail('Item feedback schema incomplete', item);
    }
  });

  const vehicleFilteredPick = chooseRaceBoxItem({
    box: { pool: ['oil', 'liftJammer'] },
    random: () => 0,
    trackKey: 'comeback-city',
    vehicleMode: 'plane',
  });
  const rarePick = chooseRaceBoxItem({
    box: { pool: ['boost', 'ghostReplay'], rare: true },
    random: () => 0,
    trackKey: 'comeback-city',
    vehicleMode: 'kart',
  });
  const fallbackPick = chooseRaceBoxItem({
    box: { pool: ['boardwalkGrip'] },
    random: () => 0,
    trackKey: 'comeback-city',
    vehicleMode: 'kart',
  });
  const signaturePick = chooseRaceBoxItem({
    box: { pool: [] },
    random: () => 0.999,
    signatureItemKey: 'anchorDrop',
    trackKey: 'tide-pier',
    vehicleMode: 'kart',
  });
  const coolingItemBox = { cooldown: 0.3 };
  const coolingItemBoxResult = resolveItemBoxPickupForFrame({
    box: coolingItemBox,
    distance: 2,
    dt: 0.1,
  });
  const farItemBox = { cooldown: 0 };
  const farItemBoxResult = resolveItemBoxPickupForFrame({
    box: farItemBox,
    distance: 5.4,
    dt: 0.1,
  });
  const readyItemBox = { cooldown: 0.02 };
  const readyItemBoxResult = resolveItemBoxPickupForFrame({
    box: readyItemBox,
    distance: 5.39,
    dt: 0.1,
  });
  const primaryPickupPlayer = {
    doubleSlotUses: 0,
    heldBalloon: null,
    heldItem: { itemKey: 'boost', level: 1 },
    secondaryHeldItem: null,
  };
  const primaryPickupBox = { cooldown: 0 };
  const primaryPickupItem = { itemKey: 'boost', key: 'boost', level: 2 };
  const primaryPickup = applyRaceItemBoxPickup({
    box: primaryPickupBox,
    item: primaryPickupItem,
    player: primaryPickupPlayer,
  });
  const secondaryPickupPlayer = {
    doubleSlotUses: 1,
    heldBalloon: { itemKey: 'shield', level: 1 },
    heldItem: { itemKey: 'shield', level: 1 },
    secondaryHeldItem: null,
  };
  const secondaryPickupBox = { cooldown: 0 };
  const secondaryPickupItem = { itemKey: 'rocket', key: 'rocket', level: 1 };
  const secondaryPickup = applyRaceItemBoxPickup({
    box: secondaryPickupBox,
    item: secondaryPickupItem,
    player: secondaryPickupPlayer,
  });
  const collectedBoxPlayer = {
    doubleSlotUses: 0,
    heldBalloon: { itemKey: 'boost', level: 1 },
    heldItem: { itemKey: 'boost', level: 1 },
    rareNextPickup: true,
    secondaryHeldItem: null,
    vehicleMode: 'kart',
  };
  const collectedBox = {
    box: { pool: ['boost', 'shield'] },
    cooldown: 0,
    type: { color: '#2cc8ff', key: 'blue' },
  };
  const collectedBoxPickup = collectRaceItemBoxForPlayer({
    box: collectedBox,
    player: collectedBoxPlayer,
    random: () => 0,
    signatureItemKey: 'anchorDrop',
    trackKey: 'comeback-city',
    vehicleMode: collectedBoxPlayer.vehicleMode,
  });
  const bananaScatterRacer = {
    bananas: 5,
    heading: Math.PI / 2,
    position: { x: 10, y: 0.5, z: 20 },
  };
  const bananaScatter = resolveBananaScatterForRacer({
    amount: 3,
    racer: bananaScatterRacer,
  });
  const emptyBananaScatterRacer = {
    bananas: 0,
    heading: 0,
    position: { x: 0, y: 0, z: 0 },
  };
  const emptyBananaScatter = resolveBananaScatterForRacer({
    amount: 3,
    racer: emptyBananaScatterRacer,
  });
  const trackBananaPlayer = {
    bananas: 1,
    magnetTimer: 1,
    position: new THREE.Vector3(0, 0, 0),
  };
  const trackBananas = [
    { cooldown: 0.05, position: new THREE.Vector3(8, 0, 0) },
    { cooldown: 0, position: new THREE.Vector3(3, 0, 0) },
  ];
  const trackBananaFrame = updateTrackBananasForPlayer({
    bananas: trackBananas,
    dt: 0.1,
    player: trackBananaPlayer,
  });
  const droppedBananaPlayer = {
    bananas: 2,
    magnetTimer: 1,
    position: new THREE.Vector3(0, 0, 0),
  };
  const droppedBananas = [
    {
      life: 1,
      position: new THREE.Vector3(10, 0, 0),
      radius: 1,
      velocity: new THREE.Vector3(-1, 0, 0),
    },
    {
      life: 1,
      position: new THREE.Vector3(2, 0, 0),
      radius: 3.5,
      velocity: new THREE.Vector3(0, 0, 0),
    },
  ];
  const droppedBananaFrame = updateDroppedBananasForPlayer({
    bananas: droppedBananas,
    dt: 0.1,
    player: droppedBananaPlayer,
  });
  const magnetRivalPullPlayer = {
    magnetTimer: 1,
    position: new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(0, 0, 0),
  };
  const magnetRivalPullTarget = {
    key: 'near-ahead',
    position: new THREE.Vector3(0, 0, 5),
    score: 3,
  };
  const magnetRivalPullFarTarget = {
    key: 'far-ahead',
    position: new THREE.Vector3(10, 0, 0),
    score: 4,
  };
  const magnetRivalPull = applyBananaMagnetRivalPullForFrame({
    dt: 0.2,
    player: magnetRivalPullPlayer,
    rivals: [
      { finished: false, key: 'behind', position: new THREE.Vector3(1, 0, 0), score: 0 },
      { finished: true, key: 'finished-ahead', position: new THREE.Vector3(0, 0, 1), score: 9 },
      magnetRivalPullFarTarget,
      magnetRivalPullTarget,
    ],
    scoreRacer: (racer) => racer.score || 1,
  });
  const inactiveMagnetRivalPull = applyBananaMagnetRivalPullForFrame({
    dt: 0.2,
    player: {
      magnetTimer: 0,
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
    },
    rivals: [magnetRivalPullTarget],
    scoreRacer: (racer) => racer.score || 1,
  });
  const bananaSpendPlayer = { bananas: 6 };
  const bananaSpend = spendRaceBananasForPlayer({
    amount: 4,
    player: bananaSpendPlayer,
  });
  const blockedBananaSpendPlayer = { bananas: 2 };
  const blockedBananaSpend = spendRaceBananasForPlayer({
    amount: 5,
    player: blockedBananaSpendPlayer,
  });
  const upgradeHeldPlayer = {
    bananas: 3,
    heldBalloon: createHeldRaceItem('boost', 1),
    heldItem: createHeldRaceItem('boost', 1),
  };
  const heldUpgrade = upgradeHeldRaceItemForPlayer({ player: upgradeHeldPlayer });
  const maxUpgradePlayer = {
    bananas: 9,
    heldBalloon: createHeldRaceItem('shield', 3),
    heldItem: createHeldRaceItem('shield', 3),
  };
  const blockedMaxUpgrade = upgradeHeldRaceItemForPlayer({ player: maxUpgradePlayer });
  const poorUpgradePlayer = {
    bananas: 2,
    heldBalloon: createHeldRaceItem('rocket', 1),
    heldItem: createHeldRaceItem('rocket', 1),
  };
  const blockedPoorUpgrade = upgradeHeldRaceItemForPlayer({ player: poorUpgradePlayer });
  const rareBuyPlayer = { bananas: 5, rareNextPickup: false };
  const rareBuy = buyRareRacePickupForPlayer({ player: rareBuyPlayer });
  const blockedRareBuyPlayer = { bananas: 4, rareNextPickup: false };
  const blockedRareBuy = buyRareRacePickupForPlayer({ player: blockedRareBuyPlayer });
  const doubleSlotBuyPlayer = { bananas: 8, doubleSlotUses: 0 };
  const doubleSlotBuy = buyRaceDoubleSlotForPlayer({ player: doubleSlotBuyPlayer });
  const blockedDoubleSlotBuyPlayer = { bananas: 7, doubleSlotUses: 0 };
  const blockedDoubleSlotBuy = buyRaceDoubleSlotForPlayer({ player: blockedDoubleSlotBuyPlayer });
  const promoteAfterUsePlayer = {
    heldBalloon: { itemKey: 'shield' },
    heldItem: { itemKey: 'shield' },
    secondaryHeldItem: { itemKey: 'rocket' },
  };
  const promotedAfterUse = advanceHeldRaceItemAfterUse({ player: promoteAfterUsePlayer });
  const clearAfterUsePlayer = {
    heldBalloon: { itemKey: 'shield' },
    heldItem: { itemKey: 'shield' },
    secondaryHeldItem: null,
  };
  const clearedAfterUse = advanceHeldRaceItemAfterUse({ player: clearAfterUsePlayer });
  const clampedHeldItem = createHeldRaceItem('shield', 99, { color: '#000000' });
  const fallbackHeldItem = createHeldRaceItem('unknownItem', 0, { color: '#123456' });
  const allowedPlayerUse = resolveRaceItemUseRequest({
    itemLike: clampedHeldItem,
    level: clampedHeldItem.level,
    requireVehicleAllowed: true,
    trackKey: 'comeback-city',
    vehicleMode: 'kart',
  });
  const missingItemUse = resolveRaceItemUseRequest({
    itemLike: null,
    trackKey: 'comeback-city',
    vehicleMode: 'kart',
  });
  const unknownItemUse = resolveRaceItemUseRequest({
    itemLike: 'missingItem',
    trackKey: 'comeback-city',
    vehicleMode: 'kart',
  });
  const trackRestrictedUse = resolveRaceItemUseRequest({
    itemLike: 'anchorDrop',
    requireVehicleAllowed: true,
    trackKey: 'comeback-city',
    vehicleMode: 'kart',
  });
  const playerVehicleRestrictedUse = resolveRaceItemUseRequest({
    itemLike: 'liftJammer',
    requireVehicleAllowed: true,
    trackKey: 'comeback-city',
    vehicleMode: 'kart',
  });
  const rivalVehicleIgnoredUse = resolveRaceItemUseRequest({
    itemLike: 'liftJammer',
    requireVehicleAllowed: false,
    trackKey: 'comeback-city',
    vehicleMode: 'kart',
  });
  const oilTrapUse = resolveRaceTrapItemUse({
    definition: getItemDefinition('oil'),
    itemKey: 'oil',
    level: 2,
  });
  const decoyTrapUse = resolveRaceTrapItemUse({
    definition: getItemDefinition('decoyCrate'),
    itemKey: 'decoyCrate',
    level: 1,
  });
  const anchorTrapUse = resolveRaceTrapItemUse({
    definition: getItemDefinition('anchorDrop'),
    itemKey: 'anchorDrop',
    level: 3,
  });
  const bubbleTrapUse = resolveRaceTrapItemUse({
    definition: getItemDefinition('bubbleTrap'),
    itemKey: 'bubbleTrap',
    level: 1,
  });
  const boostTrapUse = resolveRaceTrapItemUse({
    definition: getItemDefinition('boost'),
    itemKey: 'boost',
    level: 1,
  });
  const oilDroppedHazardOwner = { key: 'oil-owner' };
  const oilDroppedHazard = resolveDroppedRaceHazard({
    definition: getItemDefinition('oil'),
    heading: Math.PI / 2,
    itemKey: 'oil',
    level: 2,
    options: {
      effect: oilTrapUse.effect,
      life: oilTrapUse.life,
    },
    owner: oilDroppedHazardOwner,
    position: { x: 10, y: 1.25, z: 5 },
  });
  const anchorDroppedHazard = resolveDroppedRaceHazard({
    definition: getItemDefinition('anchorDrop'),
    heading: 0,
    itemKey: 'anchorDrop',
    level: 3,
    options: {
      effect: anchorTrapUse.effect,
      life: anchorTrapUse.life,
    },
    position: { x: 4, y: 0, z: 10 },
  });
  const oilDroppedHazardContact = resolveDroppedHazardContact({
    defaultVehicle: 'kart',
    hazard: oilDroppedHazard,
    racer: { finished: false, position: { x: 4, z: 5 }, vehicleMode: 'hover' },
  });
  const ownerDroppedHazardContact = resolveDroppedHazardContact({
    hazard: oilDroppedHazard,
    racer: oilDroppedHazardOwner,
  });
  const finishedDroppedHazardContact = resolveDroppedHazardContact({
    hazard: oilDroppedHazard,
    racer: { finished: true, position: { x: 4, z: 5 }, vehicleMode: 'kart' },
  });
  const vehicleFilteredDroppedHazardContact = resolveDroppedHazardContact({
    hazard: oilDroppedHazard,
    racer: { finished: false, position: { x: 4, z: 5 }, vehicleMode: 'plane' },
  });
  const spinDroppedHazardContact = resolveDroppedHazardContact({
    hazard: {
      effect: 'spin',
      life: 1,
      position: { x: 0, z: 0 },
      radius: 2,
      vehicleFilter: 'both',
    },
    racer: { finished: false, position: { x: 1, z: 0 }, vehicleMode: 'kart' },
  });
  const dragDroppedHazardContact = resolveDroppedHazardContact({
    hazard: anchorDroppedHazard,
    racer: { finished: false, position: { x: 4, z: 1.2 }, vehicleMode: 'kart' },
  });
  const expiredDroppedHazardContact = resolveDroppedHazardContact({
    hazard: { ...oilDroppedHazard, life: 0 },
    racer: { finished: false, position: { x: 4, z: 5 }, vehicleMode: 'kart' },
  });
  const typeTriggerHazards = [
    { eventPulse: 0.5, type: 'seagulls' },
    { eventPulse: 3.5, type: 'mineCart' },
  ];
  const typeHazardTriggered = triggerRaceHazardByType({
    duration: 3.4,
    hazardType: 'seagulls',
    message: 'Dock bell',
    trackHazards: typeTriggerHazards,
  });
  const typeHazardPulsePreserved = triggerRaceHazardByType({
    duration: 1.2,
    hazardType: 'mineCart',
    message: null,
    trackHazards: typeTriggerHazards,
  });
  const typeHazardMissing = triggerRaceHazardByType({
    duration: 2,
    hazardType: 'missingHazard',
    message: 'Missing still calls out',
    trackHazards: typeTriggerHazards,
  });
  const testVector = (x = 0, y = 0, z = 0) => ({
    x,
    y,
    z,
    addScaledVector(vector, scalar) {
      this.x += vector.x * scalar;
      this.y += vector.y * scalar;
      this.z += vector.z * scalar;
      return this;
    },
    clone() {
      return testVector(this.x, this.y, this.z);
    },
    length() {
      return Math.hypot(this.x, this.y, this.z);
    },
    multiplyScalar(scalar) {
      this.x *= scalar;
      this.y *= scalar;
      this.z *= scalar;
      return this;
    },
    normalize() {
      const length = this.length() || 1;
      this.x /= length;
      this.y /= length;
      this.z /= length;
      return this;
    },
    setY(value) {
      this.y = value;
      return this;
    },
    sub(vector) {
      this.x -= vector.x;
      this.y -= vector.y;
      this.z -= vector.z;
      return this;
    },
  });
  const droppedHazardFrameCalls = [];
  const droppedHazardFramePlayer = {
    finished: false,
    heading: Math.PI / 2,
    position: testVector(4, 0, 1.2),
    vehicleMode: 'kart',
    velocity: testVector(0, 0, 0),
  };
  const droppedHazardFrameRival = {
    finished: false,
    heading: 0,
    position: testVector(20, 0, 0),
    vehicleMode: 'kart',
    velocity: testVector(0, 0, 0),
  };
  const droppedHazardFrameHazards = [
    { ...anchorDroppedHazard, position: { x: 4, z: 1.2 } },
    { effect: 'spin', life: 1, position: { x: 20, z: 0 }, radius: 2, vehicleFilter: 'both' },
    { effect: 'slow', life: 2, position: { x: 100, z: 0 }, radius: 1, vehicleFilter: 'both' },
  ];
  const droppedHazardFrame = updateDroppedHazardsForFrame({
    dt: 0.1,
    hazards: droppedHazardFrameHazards,
    hitPlayer: (severity) => droppedHazardFrameCalls.push({ severity, type: 'hit-player' }),
    hitRival: (racer, severity) => droppedHazardFrameCalls.push({ racer, severity, type: 'hit-rival' }),
    player: droppedHazardFramePlayer,
    rivals: [droppedHazardFrameRival],
  });
  const hazardEffectCalls = [];
  const hazardEffectCallbacks = {
    addBoost: (racer, duration, impulse, tier, source) => {
      hazardEffectCalls.push({ duration, impulse, racer, source, tier, type: 'boost' });
    },
    getNextVehicleMode: () => 'hover',
    hitPlayer: (severity) => {
      hazardEffectCalls.push({ severity, type: 'hit-player' });
    },
    hitRival: (racer, severity) => {
      hazardEffectCalls.push({ racer, severity, type: 'hit-rival' });
    },
    setVehicleMode: (racer, nextMode, options) => {
      hazardEffectCalls.push({ nextMode, options, racer, type: 'set-vehicle' });
    },
  };
  const slowHazardRacer = {
    position: testVector(0, 0, 0),
    speed: 10,
    vehicleMode: 'kart',
    velocity: testVector(10, 0, 0),
  };
  const slowHazardEffect = applyRaceHazardEffect({
    ...hazardEffectCallbacks,
    dt: 0.1,
    hazard: { type: 'wet' },
    racer: slowHazardRacer,
  });
  const vehicleFilteredHazardEffect = applyRaceHazardEffect({
    ...hazardEffectCallbacks,
    dt: 0.1,
    hazard: { type: 'laser' },
    racer: { position: testVector(), vehicleMode: 'kart', velocity: testVector() },
  });
  const invincibleHazardEffect = applyRaceHazardEffect({
    ...hazardEffectCallbacks,
    dt: 0.1,
    hazard: { type: 'gate' },
    isPlayer: true,
    racer: { invincibleTimer: 1, position: testVector(), vehicleMode: 'kart', velocity: testVector() },
  });
  const boostThroughInvincibleEffect = applyRaceHazardEffect({
    ...hazardEffectCallbacks,
    dt: 0.1,
    hazard: { effect: 'boost', impulse: 9, vehicleFilter: 'kart' },
    isPlayer: true,
    racer: { invincibleTimer: 1, position: testVector(), vehicleMode: 'kart', velocity: testVector() },
  });
  const lightningRedirectLeader = { key: 'leader' };
  const lightningRodRacer = {
    lightningRodTimer: 2,
    position: testVector(),
    vehicleMode: 'kart',
    velocity: testVector(),
  };
  const lightningRedirectEffect = applyRaceHazardEffect({
    ...hazardEffectCallbacks,
    dt: 0.1,
    hazard: { severity: 1.2, type: 'lightning' },
    isPlayer: true,
    lightningRedirectTarget: () => lightningRedirectLeader,
    racer: lightningRodRacer,
  });
  const knockBackRacer = {
    position: testVector(2, 0, 0),
    vehicleMode: 'kart',
    velocity: testVector(),
  };
  const knockBackEffect = applyRaceHazardEffect({
    ...hazardEffectCallbacks,
    dt: 0.1,
    hazard: { effect: 'knock-back', force: 16, position: testVector(0, 0, 0), vehicleFilter: 'both' },
    isPlayer: true,
    racer: knockBackRacer,
  });
  const pullPlaneRacer = {
    position: testVector(1, 0, 0),
    vehicleMode: 'plane',
    velocity: testVector(),
  };
  const pullPlaneEffect = applyRaceHazardEffect({
    ...hazardEffectCallbacks,
    dt: 0.1,
    hazard: { effect: 'pull', force: 20, position: testVector(0, 0, 0), vehicleFilter: 'both' },
    racer: pullPlaneRacer,
  });
  const forceSwitchRacer = { position: testVector(), vehicleMode: 'kart', velocity: testVector() };
  const forceSwitchEffect = applyRaceHazardEffect({
    ...hazardEffectCallbacks,
    hazard: { effect: 'force-switch', vehicleFilter: 'both' },
    racer: forceSwitchRacer,
  });
  const statusHazardRacer = {
    blindTimer: 1,
    controlFlipTimer: 0,
    polarity: 1,
    polaritySwapTimer: 0,
    position: testVector(),
    switchLockedUntil: 4,
    vehicleMode: 'kart',
    velocity: testVector(),
  };
  const blindHazardEffect = applyRaceHazardEffect({
    ...hazardEffectCallbacks,
    hazard: { duration: 3.4, effect: 'blind', vehicleFilter: 'both' },
    racer: statusHazardRacer,
  });
  const controlFlipHazardEffect = applyRaceHazardEffect({
    ...hazardEffectCallbacks,
    hazard: { duration: 2.8, effect: 'control-flip', vehicleFilter: 'both' },
    racer: statusHazardRacer,
  });
  const polaritySetHazardEffect = applyRaceHazardEffect({
    ...hazardEffectCallbacks,
    hazard: { duration: 4.5, effect: 'set-polarity', polarity: -1, vehicleFilter: 'both' },
    racer: statusHazardRacer,
  });
  const switchLockHazardEffect = applyRaceHazardEffect({
    ...hazardEffectCallbacks,
    hazard: { duration: 5.25, effect: 'switch-lock', vehicleFilter: 'both' },
    raceTime: 7,
    racer: statusHazardRacer,
  });
  const polarityMismatchRacer = {
    polarity: -1,
    position: testVector(),
    vehicleMode: 'kart',
    velocity: testVector(),
  };
  const polarityMismatchEffect = applyRaceHazardEffect({
    ...hazardEffectCallbacks,
    hazard: { effect: 'polarity-check', polarity: 1, vehicleFilter: 'both' },
    racer: polarityMismatchRacer,
  });
  const boostItemBoost = resolveRaceItemBoostUse({ itemKey: 'boost', level: 2 });
  const shieldLowBoost = resolveRaceItemBoostUse({ itemKey: 'shield', level: 2 });
  const shieldTierBoost = resolveRaceItemBoostUse({ itemKey: 'shield', level: 3 });
  const rocketItemBoost = resolveRaceItemBoostUse({ itemKey: 'rocket', level: 3 });
  const ghostItemBoost = resolveRaceItemBoostUse({ itemKey: 'ghostReplay', level: 2 });
  const invincibleItemBoost = resolveRaceItemBoostUse({ itemKey: 'invincibility', level: 1 });
  const boardwalkItemBoost = resolveRaceItemBoostUse({ itemKey: 'boardwalkGrip', level: 1 });
  const warhornItemBoost = resolveRaceItemBoostUse({ itemKey: 'warhorn', level: 1 });
  const phaseKeyItemBoost = resolveRaceItemBoostUse({ itemKey: 'phaseKey', level: 1 });
  const magnetItemBoost = resolveRaceItemBoostUse({ itemKey: 'bananaMagnet', level: 1 });
  const shieldStatusRacer = { shieldTimer: 1 };
  const shieldStatusUse = applyRaceItemSelfStatusUse({
    itemKey: 'shield',
    level: 2,
    racer: shieldStatusRacer,
  });
  const ghostStatusRacer = { ghostTimer: 0 };
  const ghostStatusUse = applyRaceItemSelfStatusUse({
    itemKey: 'ghostReplay',
    level: 2,
    racer: ghostStatusRacer,
  });
  const magnetStatusRacer = { magnetTimer: 0 };
  const magnetStatusUse = applyRaceItemSelfStatusUse({
    itemKey: 'bananaMagnet',
    level: 1,
    racer: magnetStatusRacer,
  });
  const invincibleStatusRacer = { invincibleTimer: 1 };
  const invincibleStatusUse = applyRaceItemSelfStatusUse({
    itemKey: 'invincibility',
    level: 1,
    racer: invincibleStatusRacer,
  });
  const boardwalkStatusRacer = { shieldTimer: 6.4 };
  const boardwalkStatusUse = applyRaceItemSelfStatusUse({
    itemKey: 'boardwalkGrip',
    level: 1,
    racer: boardwalkStatusRacer,
  });
  const phaseStatusRacer = { invincibleTimer: 0, phaseTimer: 0 };
  const phaseStatusUse = applyRaceItemSelfStatusUse({
    itemKey: 'phaseKey',
    level: 1,
    racer: phaseStatusRacer,
  });
  const lightningStatusRacer = { invincibleTimer: 2, lightningRodTimer: 0 };
  const lightningStatusUse = applyRaceItemSelfStatusUse({
    itemKey: 'lightningRod',
    level: 1,
    racer: lightningStatusRacer,
  });
  const boostStatusUse = applyRaceItemSelfStatusUse({
    itemKey: 'boost',
    level: 1,
    racer: {},
  });
  const rocketOpponentUse = resolveRaceItemOpponentUse({ itemKey: 'rocket', level: 3 });
  const switchOpponentUse = resolveRaceItemOpponentUse({ itemKey: 'switchBolt', level: 2 });
  const liftOpponentUse = resolveRaceItemOpponentUse({ itemKey: 'liftJammer', level: 2 });
  const warhornOpponentUse = resolveRaceItemOpponentUse({ itemKey: 'warhorn', level: 1 });
  const polarityOpponentUse = resolveRaceItemOpponentUse({ itemKey: 'polaritySwap', level: 1 });
  const shieldOpponentUse = resolveRaceItemOpponentUse({ itemKey: 'shield', level: 1 });
  const hazardBellRemoteUse = resolveRaceItemRemoteHazardUse({ itemKey: 'hazardBell' });
  const tideHornRemoteUse = resolveRaceItemRemoteHazardUse({ itemKey: 'tideHorn' });
  const warhornRemoteUse = resolveRaceItemRemoteHazardUse({ itemKey: 'warhorn' });
  const boostRemoteUse = resolveRaceItemRemoteHazardUse({ itemKey: 'boost' });
  const itemUseCalls = [];
  const itemUseScore = (racer) => (racer.lap - 1) + racer.progress;
  const itemUseDistance = (a, b) => Math.hypot((a?.x || 0) - (b?.x || 0), (a?.z || 0) - (b?.z || 0));
  const itemUsePlayer = {
    lap: 1,
    polarity: 1,
    position: { x: 0, z: 0 },
    progress: 0.42,
    shieldTimer: 0,
    vehicleMode: 'kart',
  };
  const itemUseRivals = [
    { key: 'near', lap: 1, polarity: 1, position: { x: 8, z: 0 }, progress: 0.47, vehicleMode: 'plane' },
    { key: 'far', lap: 1, polarity: -1, position: { x: 160, z: 0 }, progress: 0.82, vehicleMode: 'kart' },
  ];
  const itemUseCallbacks = {
    addBoost: (racer, duration, impulse, tier, source) => {
      itemUseCalls.push({ duration, impulse, racer, source, tier, type: 'boost' });
    },
    distanceBetween: itemUseDistance,
    dropTrap: (racer, itemKey, level, options) => {
      itemUseCalls.push({ itemKey, level, options, racer, type: 'trap' });
    },
    getNextVehicleMode: () => 'hover',
    hitRival: (rival, severity) => {
      itemUseCalls.push({ rival, severity, type: 'hit-rival' });
    },
    onAllowed: (cue) => {
      itemUseCalls.push({ cue, type: 'cue' });
    },
    scoreRacer: itemUseScore,
    setVehicleMode: (rival, nextMode, options) => {
      rival.vehicleMode = nextMode;
      itemUseCalls.push({ nextMode, options, rival, type: 'set-vehicle' });
    },
    triggerRemoteHazard: (strength) => {
      itemUseCalls.push({ strength, type: 'remote-hazard' });
    },
  };
  const itemUseBase = {
    ...itemUseCallbacks,
    defaultVehicle: 'kart',
    racer: itemUsePlayer,
    requireVehicleAllowed: true,
    rivals: itemUseRivals,
    raceTime: 10,
    trackKey: 'comeback-city',
    vehicleMode: 'kart',
  };
  const itemUseBoost = applyRaceItemUse({ ...itemUseBase, itemLike: 'boost', level: 2 });
  const itemUseShield = applyRaceItemUse({ ...itemUseBase, itemLike: 'shield', level: 3 });
  const itemUseRocket = applyRaceItemUse({ ...itemUseBase, itemLike: 'rocket', level: 1 });
  const itemUseTrap = applyRaceItemUse({ ...itemUseBase, itemLike: 'oil', level: 2 });
  const itemUseSwitch = applyRaceItemUse({ ...itemUseBase, itemLike: 'switchBolt', level: 1 });
  itemUseRivals[0].vehicleMode = 'plane';
  const itemUseLift = applyRaceItemUse({
    ...itemUseBase,
    itemLike: 'liftJammer',
    requireVehicleAllowed: false,
  });
  const itemUseHazard = applyRaceItemUse({ ...itemUseBase, itemLike: 'hazardBell', level: 1 });
  const itemUseWarhorn = applyRaceItemUse({
    ...itemUseBase,
    itemLike: 'warhorn',
    requireVehicleAllowed: false,
    trackKey: 'giants-wakeway',
  });
  const itemUsePolarity = applyRaceItemUse({
    ...itemUseBase,
    itemLike: 'polaritySwap',
    trackKey: 'magnet-mine-descent',
  });
  const itemUseBlocked = applyRaceItemUse({ ...itemUseBase, itemLike: 'liftJammer' });
  const remoteHazards = [
    { active: true, cooldown: 0.5, eventPulse: 0.2, key: 'far', position: { x: 20, z: 0 } },
    { active: false, cooldown: 0.5, eventPulse: 9, key: 'inactive-near', position: { x: 1, z: 0 } },
    { active: true, cooldown: 2, eventPulse: 1, key: 'near', position: { x: 5, z: 0 } },
  ];
  const remoteHazardTriggered = triggerNearestRemoteHazard({
    hazards: remoteHazards,
    playerPosition: { x: 0, z: 0 },
    strength: 1.4,
  });
  const remoteHazardPulsePreserved = triggerNearestRemoteHazard({
    hazards: remoteHazards,
    playerPosition: { x: 0, z: 0 },
    strength: 0.2,
  });
  const remoteHazardEmpty = triggerNearestRemoteHazard({
    hazards: [{ active: false, eventPulse: 3, key: 'closed', position: { x: 0, z: 0 } }],
    playerPosition: { x: 0, z: 0 },
    strength: 1,
  });
  const timedHazard = {
    active: true,
    cycle: 4,
    eventPulse: 0,
    openEnd: 0.4,
    openStart: 0.2,
    phase: 0,
  };
  const timedHazardPhase = hazardCyclePhaseForTime({ cycle: timedHazard.cycle, raceTime: 1 });
  const timedHazardOpen = hazardWindowOpenForTime(timedHazard, 1);
  const timedHazardClosed = hazardWindowOpenForTime(timedHazard, 3);
  const inactiveTimedHazardActive = trackHazardActiveForTime({ ...timedHazard, active: false }, 1);
  const pulsedInactiveHazardActive = trackHazardActiveForTime(
    { ...timedHazard, active: false, eventPulse: 0.4 },
    3
  );
  const alwaysOpenHazardWindow = hazardWindowOpenForTime({ eventPulse: 0 }, 99);
  const contactHazards = [
    {
      cooldown: 0.05,
      eventPulse: 0.3,
      hitCooldown: 0.9,
      key: 'pulse-contact',
      position: { x: 0, z: 0 },
      radius: 4,
      type: 'wet',
    },
    {
      active: false,
      cooldown: 0,
      eventPulse: 0,
      key: 'inactive-contact',
      position: { x: 0, z: 0 },
      radius: 12,
      type: 'gate',
    },
    {
      active: true,
      cooldown: 0.5,
      eventPulse: 0,
      key: 'cooling-contact',
      position: { x: 0, z: 0 },
      radius: 12,
      type: 'gate',
    },
    {
      active: true,
      cooldown: 0,
      eventPulse: 0,
      key: 'default-radius-contact',
      position: { x: 16, z: 0 },
      type: 'gate',
    },
  ];
  const contactPlayer = { finished: false, key: 'player', position: { x: 1, z: 1 } };
  const contactRival = { finished: false, key: 'rival', position: { x: 2, z: 0 } };
  const contactFinished = { finished: true, key: 'finished', position: { x: 0, z: 0 } };
  const contactFar = { finished: false, key: 'far', position: { x: 20, z: 0 } };
  const hazardFrameContacts = resolveRaceTrackHazardContactsForFrame({
    dt: 0.1,
    raceTime: 1,
    racers: [contactPlayer, contactRival, contactFinished, contactFar],
    trackHazards: contactHazards,
  });
  const trackEventFlags = {};
  const trackEventPlayer = { switchLockedUntil: 1 };
  const trackEventHazards = [
    { eventPulse: 0.4, key: 'wet-1', polarity: 1, type: 'wet' },
    { eventPulse: 0.2, key: 'polarity-a', polarity: 1, type: 'polarityStrip' },
    { eventPulse: 2, key: 'polarity-b', polarity: -1, type: 'polarityGate' },
  ];
  const trackEventZones = [{ active: false, key: 'lab-zone' }];
  const trackEventMessage = applyRaceTrackEvent({
    event: {
      action: 'trigger-hazard',
      duration: 3.2,
      flag: 'stormStarted',
      hazardKey: 'wet-1',
      message: 'Storm warning',
      value: 'armed',
    },
    eventFlags: trackEventFlags,
    player: trackEventPlayer,
    raceTime: 4,
    trackHazards: trackEventHazards,
    vehicleZones: trackEventZones,
  });
  const trackEventZone = applyRaceTrackEvent({
    event: { action: 'activate-zone', active: true, zoneKey: 'lab-zone' },
    eventFlags: trackEventFlags,
    player: trackEventPlayer,
    raceTime: 4,
    trackHazards: trackEventHazards,
    vehicleZones: trackEventZones,
  });
  const trackEventLock = applyRaceTrackEvent({
    event: { action: 'set-lock', duration: 2.5 },
    eventFlags: trackEventFlags,
    player: trackEventPlayer,
    raceTime: 4,
    trackHazards: trackEventHazards,
    vehicleZones: trackEventZones,
  });
  const trackEventPolarity = applyRaceTrackEvent({
    event: { action: 'rotate-polarity' },
    eventFlags: trackEventFlags,
    player: trackEventPlayer,
    raceTime: 4,
    trackHazards: trackEventHazards,
    vehicleZones: trackEventZones,
  });
  const trackEventMissing = applyRaceTrackEvent({
    event: { action: 'trigger-hazard', hazardKey: 'missing' },
    eventFlags: trackEventFlags,
    player: trackEventPlayer,
    raceTime: 4,
    trackHazards: trackEventHazards,
    vehicleZones: trackEventZones,
  });
  const trackEventEmpty = applyRaceTrackEvent();
  const eventFrameFlags = { playerReady: true };
  const eventFrameCooldowns = { repeatHazard: 1 };
  const repeatEvent = { action: 'trigger-hazard', key: 'repeatHazard', repeatInterval: 3, trigger: 'time' };
  const lapEvent = { action: 'set-lock', key: 'lapGate', lap: 2, trigger: 'lap' };
  const positionEvent = { action: 'trigger-hazard', key: 'positionGate', progress: 0.55, trigger: 'position' };
  const playerFlagEvent = { action: 'activate-zone', flag: 'playerReady', key: 'playerFlag', trigger: 'player' };
  const blockedTimeEvent = { action: 'trigger-hazard', key: 'futureTime', time: 8, trigger: 'time' };
  const eventFrameApplied = [];
  const eventFrameMessages = [
    { life: 0.2, text: 'expired' },
    { life: 1.1, text: 'kept' },
  ];
  const eventFrame = resolveRaceTrackEventsForFrame({
    applyEvent: (event, meta) => {
      eventFrameApplied.push({ event, meta });
      if (event === lapEvent) eventFrameMessages.push({ life: 2, text: 'lap fired' });
    },
    dt: 0.4,
    eventCooldowns: eventFrameCooldowns,
    eventFlags: eventFrameFlags,
    eventMessages: eventFrameMessages,
    events: [repeatEvent, lapEvent, positionEvent, playerFlagEvent, blockedTimeEvent],
    player: { lap: 2, progress: 0.8 },
    raceTime: 4.2,
    rivals: [{ lap: 1, progress: 0.62 }],
    scoreRacer: (racer) => (racer.lap - 1) + racer.progress,
  });
  const blockedRepeatFrame = resolveRaceTrackEventsForFrame({
    dt: 0.1,
    eventCooldowns: eventFrameCooldowns,
    eventFlags: eventFrameFlags,
    eventMessages: [],
    events: [repeatEvent, lapEvent],
    player: { lap: 3, progress: 0.1 },
    raceTime: 5,
    rivals: [],
    scoreRacer: (racer) => (racer.lap - 1) + racer.progress,
  });
  if (
    vehicleFilteredPick !== 'liftJammer' ||
    rarePick !== 'ghostReplay' ||
    fallbackPick !== 'boost' ||
    signaturePick !== 'anchorDrop' ||
    coolingItemBoxResult.picked ||
    Math.abs(coolingItemBox.cooldown - 0.2) > 0.001 ||
    farItemBoxResult.picked ||
    readyItemBox.cooldown !== 0 ||
    !readyItemBoxResult.picked ||
    primaryPickup.slot !== 'primary' ||
    primaryPickupBox.cooldown !== 6.8 ||
    primaryPickupPlayer.heldItem !== primaryPickupItem ||
    primaryPickupPlayer.heldBalloon !== primaryPickupItem ||
    primaryPickupPlayer.secondaryHeldItem !== null ||
    secondaryPickup.slot !== 'secondary' ||
    secondaryPickupBox.cooldown !== 6.8 ||
    secondaryPickupPlayer.heldItem.itemKey !== 'shield' ||
    secondaryPickupPlayer.heldBalloon.itemKey !== 'shield' ||
    secondaryPickupPlayer.secondaryHeldItem !== secondaryPickupItem ||
    secondaryPickupPlayer.doubleSlotUses !== 0 ||
    collectedBoxPickup.itemKey !== 'boost' ||
    collectedBoxPickup.level !== 2 ||
    collectedBoxPickup.itemBoxSourceType !== 'blue' ||
    collectedBoxPickup.slot !== 'primary' ||
    collectedBox.cooldown !== 6.8 ||
    collectedBoxPlayer.rareNextPickup !== false ||
    collectedBoxPlayer.heldItem?.level !== 2 ||
    bananaScatter.available !== 3 ||
    bananaScatter.drops.length !== 3 ||
    bananaScatterRacer.bananas !== 2 ||
    Math.abs(bananaScatter.drops[0].angle - (Math.PI / 2 + Math.PI - 0.62)) > 0.001 ||
    Math.abs(bananaScatter.drops[0].position.x - (10 + Math.sin(Math.PI / 2 + Math.PI - 0.62) * 4.5)) > 0.001 ||
    Math.abs(bananaScatter.drops[0].position.y - 0.5) > 0.001 ||
    Math.abs(bananaScatter.drops[0].position.z - (20 + Math.cos(Math.PI / 2 + Math.PI - 0.62) * 4.5)) > 0.001 ||
    Math.abs(bananaScatter.drops[0].velocity.x - Math.sin(Math.PI / 2 + Math.PI - 0.62) * 5.5) > 0.001 ||
    Math.abs(bananaScatter.drops[2].position.x - (10 + Math.sin(Math.PI / 2 + Math.PI + 0.62) * 6.7)) > 0.001 ||
    emptyBananaScatter.available !== 0 ||
    emptyBananaScatter.drops.length !== 0 ||
    emptyBananaScatterRacer.bananas !== 0 ||
    trackBananaFrame.collected !== 1 ||
    trackBananaFrame.magnetPulls !== 2 ||
    trackBananaPlayer.bananas !== 2 ||
    Math.abs(trackBananas[0].cooldown - 0) > 0.001 ||
    Math.abs(trackBananas[0].position.x - 6.2) > 0.001 ||
    Math.abs(trackBananas[1].cooldown - 8.5) > 0.001 ||
    Math.abs(trackBananas[1].position.x - 1.2) > 0.001 ||
    droppedBananaFrame.collected !== 1 ||
    droppedBananaFrame.magnetPulls !== 2 ||
    droppedBananaPlayer.bananas !== 3 ||
    droppedBananaFrame.activeBananas.length !== 1 ||
    droppedBananaFrame.activeBananas[0] !== droppedBananas[0] ||
    Math.abs(droppedBananas[0].life - 0.9) > 0.001 ||
    Math.abs(droppedBananas[0].position.x - 7.5) > 0.001 ||
    Math.abs(droppedBananas[0].velocity.x + 0.82) > 0.001 ||
    droppedBananas[1].life !== 0 ||
    !magnetRivalPull.applied ||
    magnetRivalPull.target !== magnetRivalPullTarget ||
    Math.abs(magnetRivalPull.impulse - 2.2) > 0.001 ||
    Math.abs(magnetRivalPullPlayer.velocity.z - 2.2) > 0.001 ||
    inactiveMagnetRivalPull.applied ||
    inactiveMagnetRivalPull.reason !== 'inactive' ||
    !bananaSpend.spent ||
    bananaSpendPlayer.bananas !== 2 ||
    blockedBananaSpend.spent ||
    blockedBananaSpend.reason !== 'insufficient-bananas' ||
    blockedBananaSpendPlayer.bananas !== 2 ||
    !heldUpgrade.upgraded ||
    upgradeHeldPlayer.bananas !== 0 ||
    upgradeHeldPlayer.heldItem?.itemKey !== 'boost' ||
    upgradeHeldPlayer.heldItem?.level !== 2 ||
    upgradeHeldPlayer.heldBalloon !== upgradeHeldPlayer.heldItem ||
    blockedMaxUpgrade.upgraded ||
    blockedMaxUpgrade.reason !== 'max-level' ||
    maxUpgradePlayer.bananas !== 9 ||
    blockedPoorUpgrade.upgraded ||
    blockedPoorUpgrade.reason !== 'insufficient-bananas' ||
    poorUpgradePlayer.bananas !== 2 ||
    poorUpgradePlayer.heldItem?.level !== 1 ||
    !rareBuy.bought ||
    rareBuyPlayer.bananas !== 0 ||
    rareBuyPlayer.rareNextPickup !== true ||
    blockedRareBuy.bought ||
    blockedRareBuyPlayer.bananas !== 4 ||
    blockedRareBuyPlayer.rareNextPickup !== false ||
    !doubleSlotBuy.bought ||
    doubleSlotBuyPlayer.bananas !== 0 ||
    doubleSlotBuyPlayer.doubleSlotUses !== 1 ||
    blockedDoubleSlotBuy.bought ||
    blockedDoubleSlotBuyPlayer.bananas !== 7 ||
    blockedDoubleSlotBuyPlayer.doubleSlotUses !== 0 ||
    !promotedAfterUse.promoted ||
    promoteAfterUsePlayer.heldItem?.itemKey !== 'rocket' ||
    promoteAfterUsePlayer.heldBalloon?.itemKey !== 'rocket' ||
    promoteAfterUsePlayer.secondaryHeldItem !== null ||
    clearedAfterUse.promoted ||
    clearAfterUsePlayer.heldItem !== null ||
    clearAfterUsePlayer.heldBalloon !== null ||
    clearAfterUsePlayer.secondaryHeldItem !== null ||
    clampedHeldItem.color !== ITEM_COLORS.shield ||
    clampedHeldItem.level !== 3 ||
    clampedHeldItem.category !== 'setup' ||
    clampedHeldItem.vehicleRestriction !== 'both' ||
    fallbackHeldItem.color !== '#123456' ||
    fallbackHeldItem.level !== 1 ||
    fallbackHeldItem.category !== 'unknown' ||
    fallbackHeldItem.rarity !== 'common' ||
    !allowedPlayerUse.allowed ||
    allowedPlayerUse.itemKey !== 'shield' ||
    allowedPlayerUse.definition?.key !== 'shield' ||
    allowedPlayerUse.level !== 3 ||
    missingItemUse.reason !== 'missing-item' ||
    unknownItemUse.reason !== 'unknown-item' ||
    trackRestrictedUse.reason !== 'track-restricted' ||
    playerVehicleRestrictedUse.reason !== 'vehicle-restricted' ||
    !rivalVehicleIgnoredUse.allowed ||
    !oilTrapUse.trap ||
    oilTrapUse.effect !== 'slow' ||
    Math.abs(oilTrapUse.life - 11.4) > 0.001 ||
    !decoyTrapUse.trap ||
    decoyTrapUse.effect !== 'spin' ||
    Math.abs(decoyTrapUse.life - 13.2) > 0.001 ||
    !anchorTrapUse.trap ||
    anchorTrapUse.effect !== 'drag' ||
    Math.abs(anchorTrapUse.life - 18.6) > 0.001 ||
    !bubbleTrapUse.trap ||
    bubbleTrapUse.effect !== 'slow' ||
    Math.abs(bubbleTrapUse.life - 11.2) > 0.001 ||
    boostTrapUse.trap ||
    boostTrapUse.life !== 0 ||
    oilDroppedHazard.effect !== 'slow' ||
    oilDroppedHazard.itemKey !== 'oil' ||
    oilDroppedHazard.owner !== oilDroppedHazardOwner ||
    Math.abs(oilDroppedHazard.position.x - 2.2) > 0.001 ||
    oilDroppedHazard.position.y !== 1.25 ||
    Math.abs(oilDroppedHazard.position.z - 5) > 0.001 ||
    Math.abs(oilDroppedHazard.life - 11.4) > 0.001 ||
    Math.abs(oilDroppedHazard.radius - 4.7) > 0.001 ||
    oilDroppedHazard.vehicleFilter !== 'kart' ||
    anchorDroppedHazard.effect !== 'drag' ||
    anchorDroppedHazard.dragBackward !== 3 ||
    Math.abs(anchorDroppedHazard.position.x - 4) > 0.001 ||
    Math.abs(anchorDroppedHazard.position.z - 1.2) > 0.001 ||
    Math.abs(anchorDroppedHazard.life - 18.6) > 0.001 ||
    Math.abs(anchorDroppedHazard.radius - 5.45) > 0.001 ||
    anchorDroppedHazard.vehicleFilter !== 'kart' ||
    !oilDroppedHazardContact.hit ||
    oilDroppedHazardContact.effect !== 'slow' ||
    oilDroppedHazardContact.playerHitSeverity !== 0.9 ||
    oilDroppedHazardContact.rivalHitSeverity !== 0.9 ||
    ownerDroppedHazardContact.reason !== 'owner' ||
    finishedDroppedHazardContact.reason !== 'finished' ||
    vehicleFilteredDroppedHazardContact.reason !== 'vehicle-filter' ||
    !spinDroppedHazardContact.hit ||
    spinDroppedHazardContact.rivalHitSeverity !== 1.05 ||
    !dragDroppedHazardContact.hit ||
    dragDroppedHazardContact.dragBackward !== 3 ||
    expiredDroppedHazardContact.reason !== 'expired' ||
    droppedHazardFrame.contacts.length !== 2 ||
    droppedHazardFrame.activeHazards.length !== 1 ||
    droppedHazardFrame.activeHazards[0] !== droppedHazardFrameHazards[2] ||
    Math.abs(droppedHazardFrameHazards[2].life - 1.9) > 0.001 ||
    Math.abs(droppedHazardFramePlayer.position.x - 1) > 0.001 ||
    !droppedHazardFrameCalls.some((entry) => entry.type === 'hit-player' && entry.severity === 0.9) ||
    !droppedHazardFrameCalls.some(
      (entry) => entry.type === 'hit-rival' && entry.racer === droppedHazardFrameRival && entry.severity === 1.05
    ) ||
    !typeHazardTriggered.triggered ||
    typeHazardTriggered.hazard !== typeTriggerHazards[0] ||
    typeTriggerHazards[0].eventPulse !== 3.4 ||
    typeHazardTriggered.message?.text !== 'Dock bell' ||
    typeHazardTriggered.message?.life !== 2 ||
    !typeHazardPulsePreserved.triggered ||
    typeTriggerHazards[1].eventPulse !== 3.5 ||
    typeHazardPulsePreserved.message !== null ||
    typeHazardMissing.triggered ||
    typeHazardMissing.hazard !== null ||
    typeHazardMissing.message?.text !== 'Missing still calls out' ||
    !slowHazardEffect.applied ||
    slowHazardEffect.effect !== 'slow' ||
    Math.abs(slowHazardRacer.velocity.x - 8.6) > 0.001 ||
    Math.abs(slowHazardRacer.speed - 8.8) > 0.001 ||
    vehicleFilteredHazardEffect.reason !== 'vehicle-filter' ||
    invincibleHazardEffect.reason !== 'invincible' ||
    !boostThroughInvincibleEffect.applied ||
    boostThroughInvincibleEffect.boost?.source !== 'pad' ||
    boostThroughInvincibleEffect.boost?.impulse !== 9 ||
    !lightningRedirectEffect.lightningRedirected ||
    lightningRedirectEffect.redirectedTarget !== lightningRedirectLeader ||
    lightningRodRacer.lightningRodTimer !== 0 ||
    !hazardEffectCalls.some((entry) => entry.type === 'hit-rival' && entry.racer === lightningRedirectLeader && entry.severity === 1.2) ||
    !knockBackEffect.applied ||
    knockBackEffect.hit?.severity !== 0.35 ||
    Math.abs(knockBackRacer.velocity.x - 1.6) > 0.001 ||
    !hazardEffectCalls.some((entry) => entry.type === 'hit-player' && entry.severity === 0.35) ||
    !pullPlaneEffect.applied ||
    pullPlaneEffect.boost?.source !== 'trick' ||
    Math.abs(pullPlaneRacer.velocity.x + 2) > 0.001 ||
    !hazardEffectCalls.some((entry) => entry.type === 'boost' && entry.racer === pullPlaneRacer && entry.source === 'trick') ||
    !forceSwitchEffect.applied ||
    forceSwitchEffect.nextMode !== 'hover' ||
    !hazardEffectCalls.some((entry) => entry.type === 'set-vehicle' && entry.racer === forceSwitchRacer && entry.nextMode === 'hover' && entry.options?.force) ||
    !blindHazardEffect.applied ||
    statusHazardRacer.blindTimer !== 3.4 ||
    !controlFlipHazardEffect.applied ||
    statusHazardRacer.controlFlipTimer !== 2.8 ||
    !polaritySetHazardEffect.applied ||
    statusHazardRacer.polarity !== -1 ||
    statusHazardRacer.polaritySwapTimer !== 4.5 ||
    !switchLockHazardEffect.applied ||
    statusHazardRacer.switchLockedUntil !== 12.25 ||
    !polarityMismatchEffect.applied ||
    polarityMismatchEffect.hit?.severity !== 0.72 ||
    !hazardEffectCalls.some((entry) => entry.type === 'hit-rival' && entry.racer === polarityMismatchRacer && entry.severity === 0.72) ||
    !boostItemBoost.boost ||
    Math.abs(boostItemBoost.duration - 1.39) > 0.001 ||
    boostItemBoost.impulse !== 23 ||
    boostItemBoost.tier !== 2 ||
    shieldLowBoost.boost ||
    !shieldTierBoost.boost ||
    shieldTierBoost.duration !== 0.55 ||
    shieldTierBoost.impulse !== 8 ||
    shieldTierBoost.tier !== 2 ||
    !rocketItemBoost.boost ||
    Math.abs(rocketItemBoost.duration - 0.46) > 0.001 ||
    rocketItemBoost.impulse !== 10 ||
    rocketItemBoost.tier !== 3 ||
    !ghostItemBoost.boost ||
    Math.abs(ghostItemBoost.duration - 0.58) > 0.001 ||
    Math.abs(ghostItemBoost.impulse - 9.8) > 0.001 ||
    ghostItemBoost.tier !== 2 ||
    !invincibleItemBoost.boost ||
    invincibleItemBoost.duration !== 0.55 ||
    invincibleItemBoost.impulse !== 8 ||
    invincibleItemBoost.tier !== 2 ||
    !boardwalkItemBoost.boost ||
    boardwalkItemBoost.duration !== 0.65 ||
    boardwalkItemBoost.impulse !== 8 ||
    boardwalkItemBoost.tier !== 2 ||
    !warhornItemBoost.boost ||
    warhornItemBoost.duration !== 1 ||
    warhornItemBoost.impulse !== 13 ||
    warhornItemBoost.tier !== 2 ||
    !phaseKeyItemBoost.boost ||
    phaseKeyItemBoost.duration !== 0.82 ||
    phaseKeyItemBoost.impulse !== 12 ||
    phaseKeyItemBoost.tier !== 2 ||
    magnetItemBoost.boost ||
    magnetItemBoost.source !== null ||
    !shieldStatusUse.applied ||
    shieldStatusUse.statuses.length !== 1 ||
    Math.abs(shieldStatusRacer.shieldTimer - 6.2) > 0.001 ||
    !ghostStatusUse.applied ||
    Math.abs(ghostStatusRacer.ghostTimer - 5.6) > 0.001 ||
    !magnetStatusUse.applied ||
    Math.abs(magnetStatusRacer.magnetTimer - 5.7) > 0.001 ||
    !invincibleStatusUse.applied ||
    Math.abs(invincibleStatusRacer.invincibleTimer - 3.95) > 0.001 ||
    !boardwalkStatusUse.applied ||
    boardwalkStatusRacer.shieldTimer !== 6.4 ||
    !phaseStatusUse.applied ||
    phaseStatusRacer.phaseTimer !== 4.8 ||
    phaseStatusRacer.invincibleTimer !== 1.2 ||
    !lightningStatusUse.applied ||
    lightningStatusRacer.lightningRodTimer !== 8 ||
    lightningStatusRacer.invincibleTimer !== 2 ||
    boostStatusUse.applied ||
    boostStatusUse.status ||
    !rocketOpponentUse.opponent ||
    rocketOpponentUse.target !== 'nearest' ||
    Math.abs(rocketOpponentUse.hitSeverity - 1.76) > 0.001 ||
    !switchOpponentUse.opponent ||
    !switchOpponentUse.switchVehicle ||
    Math.abs(switchOpponentUse.switchLockDuration - 2.6) > 0.001 ||
    switchOpponentUse.hitSeverity !== 0.45 ||
    !liftOpponentUse.opponent ||
    liftOpponentUse.target !== 'all' ||
    Math.abs(liftOpponentUse.liftDisabledDuration - 4.8) > 0.001 ||
    liftOpponentUse.planeHitSeverity !== 0.52 ||
    !warhornOpponentUse.opponent ||
    warhornOpponentUse.target !== 'ahead-or-radius' ||
    warhornOpponentUse.hitRadius !== 72 ||
    warhornOpponentUse.hitSeverity !== 1.05 ||
    !polarityOpponentUse.opponent ||
    !polarityOpponentUse.polarityFlip ||
    polarityOpponentUse.polaritySwapDuration !== 3 ||
    polarityOpponentUse.hitSeverity !== 0.35 ||
    shieldOpponentUse.opponent ||
    shieldOpponentUse.target !== null ||
    !hazardBellRemoteUse.remoteHazard ||
    hazardBellRemoteUse.strength !== 1 ||
    !tideHornRemoteUse.remoteHazard ||
    tideHornRemoteUse.strength !== 1.4 ||
    !warhornRemoteUse.remoteHazard ||
    warhornRemoteUse.strength !== 1.25 ||
    boostRemoteUse.remoteHazard ||
    boostRemoteUse.strength !== 0 ||
    !itemUseBoost.applied ||
    itemUseBoost.action !== 'boost' ||
    !itemUseBoost.boostApplied ||
    !itemUseShield.statusApplied ||
    !itemUseShield.boostApplied ||
    itemUsePlayer.shieldTimer < 7.69 ||
    itemUseRocket.target !== itemUseRivals[0] ||
    !itemUseCalls.some((entry) => entry.type === 'hit-rival' && entry.rival === itemUseRivals[0] && Math.abs(entry.severity - 1.12) < 0.001) ||
    itemUseTrap.trapUse?.effect !== 'slow' ||
    !itemUseCalls.some((entry) => entry.type === 'trap' && entry.itemKey === 'oil' && entry.options?.effect === 'slow') ||
    itemUseSwitch.target !== itemUseRivals[0] ||
    Math.abs(itemUseRivals[0].switchLockedUntil - 12.2) > 0.001 ||
    !itemUseCalls.some((entry) => entry.type === 'set-vehicle' && entry.rival === itemUseRivals[0] && entry.nextMode === 'hover' && entry.options?.force) ||
    itemUseLift.targetCount !== 2 ||
    !itemUseCalls.some((entry) => entry.type === 'hit-rival' && entry.rival === itemUseRivals[0] && entry.severity === 0.52) ||
    itemUseHazard.strength !== 1 ||
    !itemUseCalls.some((entry) => entry.type === 'remote-hazard' && entry.strength === 1) ||
    itemUseWarhorn.targets.length !== 2 ||
    !itemUseCalls.some((entry) => entry.type === 'remote-hazard' && entry.strength === 1.25) ||
    !itemUsePolarity.applied ||
    itemUseRivals[0].polarity !== -1 ||
    itemUseRivals[1].polarity !== 1 ||
    itemUseBlocked.applied ||
    itemUseBlocked.reason !== 'vehicle-restricted' ||
    !remoteHazardTriggered.triggered ||
    remoteHazardTriggered.target?.key !== 'near' ||
    Math.abs(remoteHazards[2].eventPulse - 2.52) > 0.001 ||
    remoteHazards[2].cooldown !== 0 ||
    remoteHazards[0].cooldown !== 0.5 ||
    remoteHazards[1].eventPulse !== 9 ||
    remoteHazardTriggered.message.text !== 'Hazard Triggered' ||
    remoteHazardTriggered.message.life !== 1.8 ||
    !remoteHazardPulsePreserved.triggered ||
    Math.abs(remoteHazards[2].eventPulse - 2.52) > 0.001 ||
    remoteHazardEmpty.triggered ||
    remoteHazardEmpty.eventPulse !== 0 ||
    remoteHazardEmpty.message.text !== 'No Hazard Armed' ||
    remoteHazardEmpty.message.life !== 1.8 ||
    Math.abs(timedHazardPhase - 0.25) > 0.001 ||
    !timedHazardOpen ||
    timedHazardClosed ||
    inactiveTimedHazardActive ||
    !pulsedInactiveHazardActive ||
    !alwaysOpenHazardWindow ||
    hazardFrameContacts.length !== 3 ||
    hazardFrameContacts[0].hazard !== contactHazards[0] ||
    hazardFrameContacts[0].racer !== contactPlayer ||
    hazardFrameContacts[1].racer !== contactRival ||
    hazardFrameContacts[2].hazard !== contactHazards[3] ||
    hazardFrameContacts[2].racer !== contactFar ||
    Math.abs(contactHazards[0].eventPulse - 0.2) > 0.001 ||
    contactHazards[0].cooldown !== 0.9 ||
    contactHazards[1].cooldown !== 0 ||
    Math.abs(contactHazards[2].cooldown - 0.4) > 0.001 ||
    contactHazards[3].cooldown !== 0.45 ||
    hazardFrameContacts.some((contact) => contact.racer === contactFinished) ||
    trackEventFlags.stormStarted !== 'armed' ||
    trackEventMessage.message?.text !== 'Storm warning' ||
    trackEventMessage.message?.life !== 2.2 ||
    trackEventHazards[0].eventPulse !== 3.2 ||
    trackEventMessage.hazard !== trackEventHazards[0] ||
    !trackEventZone.zone ||
    trackEventZones[0].active !== true ||
    trackEventLock.switchLockUntil !== 6.5 ||
    trackEventPlayer.switchLockedUntil !== 6.5 ||
    trackEventPolarity.rotatedHazards.length !== 2 ||
    trackEventHazards[1].polarity !== -1 ||
    Math.abs(trackEventHazards[1].eventPulse - 1.2) > 0.001 ||
    trackEventHazards[2].polarity !== 1 ||
    trackEventHazards[2].eventPulse !== 2 ||
    trackEventMissing.hazard !== null ||
    trackEventEmpty.applied ||
    eventFrame.triggeredEvents.length !== 4 ||
    eventFrame.triggeredEvents[0].event !== repeatEvent ||
    eventFrame.triggeredEvents[0].repeat !== true ||
    eventFrame.triggeredEvents[1].event !== lapEvent ||
    eventFrame.triggeredEvents[2].event !== positionEvent ||
    eventFrame.triggeredEvents[3].event !== playerFlagEvent ||
    eventFrameApplied.length !== 4 ||
    eventFrameApplied[0].event !== repeatEvent ||
    eventFrameApplied[0].meta?.repeat !== true ||
    eventFrameApplied[1].event !== lapEvent ||
    eventFrameApplied[1].meta?.key !== 'lapGate' ||
    eventFrameCooldowns.repeatHazard !== 4.2 ||
    eventFrameFlags['fired:lapGate'] !== true ||
    eventFrameFlags['fired:positionGate'] !== true ||
    eventFrameFlags['fired:playerFlag'] !== true ||
    eventFrameFlags['fired:repeatHazard'] ||
    eventFrame.eventMessages.length !== 2 ||
    eventFrame.eventMessages[0].text !== 'kept' ||
    Math.abs(eventFrame.eventMessages[0].life - 0.7) > 0.001 ||
    eventFrame.eventMessages[1].text !== 'lap fired' ||
    Math.abs(eventFrame.eventMessages[1].life - 1.6) > 0.001 ||
    blockedRepeatFrame.triggeredEvents.length !== 0 ||
    blockedRepeatFrame.eventMessages.length !== 0
  ) {
    fail('Item box helpers should preserve filtering, rare picks, fallback pool, signature inclusion, cooldown, pickup gates, held-item construction, item-use gating, boost-use options, self-status effects, banana-magnet rival pull, opponent-use options, remote-hazard options, trap-use options, dropped-hazard descriptors/contact, dropped-hazard frame update/drag/hit/filter behavior, track-hazard contacts, hazard type triggers/effects, timed hazard windows, track event scheduling/mutation, held-item slotting, and post-use promotion', {
      anchorTrapUse,
      anchorDroppedHazard,
      allowedPlayerUse,
      blindHazardEffect,
      boardwalkItemBoost,
      boardwalkStatusRacer,
      boardwalkStatusUse,
      boostItemBoost,
      boostThroughInvincibleEffect,
      boostRemoteUse,
      boostStatusUse,
      boostTrapUse,
      bubbleTrapUse,
      clampedHeldItem,
      clearedAfterUse,
      clearAfterUsePlayer,
      contactFar,
      contactFinished,
      contactHazards,
      contactPlayer,
      contactRival,
      controlFlipHazardEffect,
      collectedBox,
      collectedBoxPickup,
      collectedBoxPlayer,
      coolingItemBox,
      coolingItemBoxResult,
      blockedRepeatFrame,
      blockedTimeEvent,
      fallbackHeldItem,
      fallbackPick,
      farItemBoxResult,
      forceSwitchEffect,
      forceSwitchRacer,
      ghostItemBoost,
      ghostStatusRacer,
      ghostStatusUse,
      hazardBellRemoteUse,
      hazardEffectCalls,
      hazardFrameContacts,
      eventFrame,
      eventFrameApplied,
      eventFrameCooldowns,
      eventFrameFlags,
      eventFrameMessages,
      inactiveTimedHazardActive,
      invincibleHazardEffect,
      invincibleItemBoost,
      invincibleStatusRacer,
      invincibleStatusUse,
      inactiveMagnetRivalPull,
      itemUseBlocked,
      itemUseBoost,
      itemUseCalls,
      itemUseHazard,
      itemUseLift,
      itemUsePlayer,
      itemUsePolarity,
      itemUseRivals,
      itemUseRocket,
      itemUseShield,
      itemUseSwitch,
      itemUseTrap,
      itemUseWarhorn,
      liftOpponentUse,
      lightningStatusRacer,
      lightningStatusUse,
      lightningRedirectEffect,
      lightningRodRacer,
      knockBackEffect,
      knockBackRacer,
      magnetItemBoost,
      magnetRivalPull,
      magnetRivalPullPlayer,
      magnetStatusRacer,
      magnetStatusUse,
      missingItemUse,
      decoyTrapUse,
      dragDroppedHazardContact,
      expiredDroppedHazardContact,
      finishedDroppedHazardContact,
      oilTrapUse,
      oilDroppedHazard,
      oilDroppedHazardContact,
      ownerDroppedHazardContact,
      phaseKeyItemBoost,
      phaseStatusRacer,
      phaseStatusUse,
      lapEvent,
      playerVehicleRestrictedUse,
      playerFlagEvent,
      polarityMismatchEffect,
      polarityMismatchRacer,
      polarityOpponentUse,
      polaritySetHazardEffect,
      promotedAfterUse,
      promoteAfterUsePlayer,
      positionEvent,
      pullPlaneEffect,
      pullPlaneRacer,
      primaryPickup,
      primaryPickupBox,
      primaryPickupPlayer,
      rarePick,
      readyItemBox,
      readyItemBoxResult,
      remoteHazardEmpty,
      remoteHazardPulsePreserved,
      remoteHazards,
      remoteHazardTriggered,
      repeatEvent,
      pulsedInactiveHazardActive,
      rocketOpponentUse,
      rocketItemBoost,
      secondaryPickup,
      secondaryPickupBox,
      secondaryPickupPlayer,
      shieldLowBoost,
      shieldOpponentUse,
      shieldStatusRacer,
      shieldStatusUse,
      shieldTierBoost,
      signaturePick,
      slowHazardEffect,
      slowHazardRacer,
      spinDroppedHazardContact,
      statusHazardRacer,
      switchOpponentUse,
      switchLockHazardEffect,
      tideHornRemoteUse,
      trackEventEmpty,
      trackEventFlags,
      trackEventHazards,
      trackEventLock,
      trackEventMessage,
      trackEventMissing,
      trackEventPlayer,
      trackEventPolarity,
      trackEventZone,
      trackEventZones,
      typeHazardMissing,
      typeHazardPulsePreserved,
      typeHazardTriggered,
      typeTriggerHazards,
      timedHazardClosed,
      timedHazardOpen,
      timedHazardPhase,
      alwaysOpenHazardWindow,
      rivalVehicleIgnoredUse,
      trackRestrictedUse,
      unknownItemUse,
      warhornOpponentUse,
      warhornItemBoost,
      warhornRemoteUse,
      vehicleFilteredHazardEffect,
      vehicleFilteredPick,
      vehicleFilteredDroppedHazardContact,
    });
  }
};

const validateKartPhysicsHelpers = () => {
  if (DRIFT_HOP_DURATION < 0.18 || DRIFT_HOP_DURATION > 0.3) {
    fail('Drift hop duration is outside PRD target range', { DRIFT_HOP_DURATION });
  }
  if (
    !canStartDriftHop({
      driftActive: false,
      driftHopTimer: 0,
      driftInputReady: true,
      grounded: true,
      isPlane: false,
      jumpCooldown: 0,
    })
  ) {
    fail('Kart drift input should start through the hop gate');
  }
  if (
    canStartDriftHop({
      driftActive: false,
      driftHopTimer: 0,
      driftInputReady: true,
      grounded: true,
      isPlane: true,
      jumpCooldown: 0,
    })
  ) {
    fail('Plane mode must not start kart drift hops');
  }
  if (
    !canActivateDrift({
      driftHopTimer: DRIFT_HOP_DURATION,
      driftInputReady: true,
      jumpHeight: 0,
    })
  ) {
    fail('Drift should activate while the drift hop timer is active');
  }
  if (canActivateDrift({ driftHopTimer: 0, driftInputReady: true, jumpHeight: 0 })) {
    fail('Drift should not activate without hop or airborne state');
  }
  const hopVelocity = driftHopVelocityFor(48, 72);
  if (hopVelocity < 7.2 || hopVelocity > 8.3) {
    fail('Drift hop velocity is outside expected arcade hop band', { hopVelocity });
  }
  const kart = VEHICLES.kart;
  if (accelerationMultiplierForSpeed({ speedRatio: 0.5, vehicle: kart }) !== 1) {
    fail('Kart acceleration should not taper before the configured mid-speed point', {
      multiplier: accelerationMultiplierForSpeed({ speedRatio: 0.5, vehicle: kart }),
    });
  }
  const highSpeedMultiplier = accelerationMultiplierForSpeed({ speedRatio: 1, vehicle: kart });
  if (Math.abs(highSpeedMultiplier - kart.accelerationMinMultiplier) > 0.001) {
    fail('Kart acceleration should reach the configured high-speed minimum multiplier', {
      highSpeedMultiplier,
      minimum: kart.accelerationMinMultiplier,
    });
  }
  if (accelerationMultiplierForSpeed({ speedRatio: 0.9, vehicle: VEHICLES.hover }) !== 1) {
    fail('Vehicles without acceleration taper tuning should retain full acceleration multiplier');
  }
  if (
    !surfaceOffroadForState({ distance: 22, isPlane: false, jumpHeight: 0, roadWidth: 40 }) ||
    surfaceOffroadForState({ distance: 22, isPlane: true, jumpHeight: 0, roadWidth: 40 }) ||
    surfaceOffroadForState({ distance: 22, isPlane: false, jumpHeight: 0.1, roadWidth: 40 })
  ) {
    fail('Surface off-road helper should preserve road edge, plane, and jump gates');
  }
  const normalSpeedCaps = speedCapsForState({
    bananas: 2,
    boostTimer: 0,
    offroad: false,
    shieldTimer: 0,
    signedForwardSpeed: kart.maxSpeed * 0.5,
    vehicle: kart,
  });
  const offroadSpeedCaps = speedCapsForState({
    bananas: 0,
    boostTimer: 0,
    offroad: true,
    shieldTimer: 0,
    signedForwardSpeed: kart.maxSpeed * 0.5,
    vehicle: kart,
  });
  const shieldedOffroadSpeedCaps = speedCapsForState({
    bananas: 0,
    boostTimer: 0,
    offroad: true,
    shieldTimer: 1,
    signedForwardSpeed: kart.maxSpeed * 0.5,
    vehicle: kart,
  });
  const reverseSpeedCaps = speedCapsForState({
    bananas: 0,
    boostTimer: 0,
    offroad: false,
    shieldTimer: 0,
    signedForwardSpeed: -kart.maxSpeed * 0.2,
    vehicle: kart,
  });
  const boostedOffroadSpeedCaps = speedCapsForState({
    bananas: 4,
    boostTimer: 1,
    offroad: true,
    shieldTimer: 0,
    signedForwardSpeed: kart.maxSpeed,
    vehicle: kart,
  });
  if (
    Math.abs(normalSpeedCaps.forwardSpeedCap - kart.maxSpeed * 1.036) > 0.001 ||
    Math.abs(offroadSpeedCaps.forwardSpeedCap - kart.maxSpeed * kart.offroad) > 0.001 ||
    shieldedOffroadSpeedCaps.forwardSpeedCap !== kart.maxSpeed ||
    reverseSpeedCaps.speedCap !== kart.reverse ||
    Math.abs(boostedOffroadSpeedCaps.forwardSpeedCap - kart.boostMax * kart.offroad) > 0.001
  ) {
    fail('Speed cap helper should preserve banana, off-road, shield, boost, and reverse caps', {
      boostedOffroadSpeedCaps,
      normalSpeedCaps,
      offroadSpeedCaps,
      reverseSpeedCaps,
      shieldedOffroadSpeedCaps,
    });
  }
  const forwardCapVector = new THREE.Vector3(1, 0, 0);
  const cappedForwardPlayer = {
    bananas: 0,
    boostTimer: 0,
    shieldTimer: 0,
    velocity: new THREE.Vector3(100, 0, 0),
  };
  const cappedForward = applySpeedCapForFrame({
    forward: forwardCapVector,
    offroad: false,
    player: cappedForwardPlayer,
    vehicle: kart,
  });
  const cappedReversePlayer = {
    bananas: 0,
    boostTimer: 0,
    shieldTimer: 0,
    velocity: new THREE.Vector3(-40, 0, 0),
  };
  const cappedReverse = applySpeedCapForFrame({
    forward: forwardCapVector,
    offroad: false,
    player: cappedReversePlayer,
    vehicle: kart,
  });
  const cappedOffroadPlayer = {
    bananas: 0,
    boostTimer: 0,
    shieldTimer: 0,
    velocity: new THREE.Vector3(80, 0, 0),
  };
  const cappedOffroad = applySpeedCapForFrame({
    forward: forwardCapVector,
    offroad: true,
    player: cappedOffroadPlayer,
    vehicle: kart,
  });
  if (
    !cappedForward.clamped ||
    Math.abs(cappedForward.speedCap - kart.maxSpeed) > 0.001 ||
    Math.abs(cappedForwardPlayer.velocity.length() - kart.maxSpeed) > 0.001 ||
    !cappedReverse.clamped ||
    Math.abs(cappedReverse.speedCap - kart.reverse) > 0.001 ||
    Math.abs(cappedReversePlayer.velocity.length() - kart.reverse) > 0.001 ||
    cappedReversePlayer.velocity.x >= 0 ||
    !cappedOffroad.clamped ||
    Math.abs(cappedOffroad.speedCap - kart.maxSpeed * kart.offroad) > 0.001 ||
    Math.abs(cappedOffroadPlayer.velocity.length() - kart.maxSpeed * kart.offroad) > 0.001
  ) {
    fail('Speed cap application helper should preserve forward, reverse, and off-road velocity clamping', {
      cappedForward,
      cappedForwardPlayer,
      cappedOffroad,
      cappedOffroadPlayer,
      cappedReverse,
      cappedReversePlayer,
    });
  }
  const accelerateForces = driveForcesForFrame({
    dt: 0.016,
    forwardSpeed: kart.maxSpeed * 0.5,
    speed: kart.maxSpeed * 0.5,
    throttle: 1,
    vehicle: kart,
  });
  const highSpeedAccelerateForces = driveForcesForFrame({
    dt: 0.016,
    forwardSpeed: kart.maxSpeed,
    speed: kart.maxSpeed,
    throttle: 1,
    vehicle: kart,
  });
  const brakeForces = driveForcesForFrame({
    dt: 0.016,
    speed: kart.maxSpeed * 0.5,
    throttle: -0.5,
    vehicle: kart,
  });
  const coastForces = driveForcesForFrame({
    dt: 0.016,
    speed: 40,
    throttle: 0,
    vehicle: kart,
  });
  const hitForces = driveForcesForFrame({
    dt: 0.1,
    hitTimer: 0.5,
    speed: 40,
    throttle: 1,
    vehicle: kart,
  });
  if (
    accelerateForces.mode !== 'accelerate' ||
    Math.abs(accelerateForces.forwardImpulse - kart.acceleration * 0.016) > 0.001 ||
    highSpeedAccelerateForces.accelerationMultiplier !== kart.accelerationMinMultiplier ||
    brakeForces.mode !== 'brake' ||
    Math.abs(brakeForces.forwardImpulse + kart.brake * 0.5 * 0.016) > 0.001 ||
    coastForces.mode !== 'coast' ||
    Math.abs(coastForces.dragMultiplier - 0.98464) > 0.001 ||
    hitForces.mode !== 'hit' ||
    Math.abs(hitForces.dragMultiplier - 0.82) > 0.001 ||
    Math.abs(hitForces.nextHitTimer - 0.4) > 0.001
  ) {
    fail('Drive force helper should preserve acceleration taper, braking, coasting, and hit drag behavior', {
      accelerateForces,
      brakeForces,
      coastForces,
      highSpeedAccelerateForces,
      hitForces,
    });
  }
  const airbornePlayer = {
    flightAltitude: 12,
    flightPitch: 0.2,
    flightRoll: -0.1,
    flightVerticalVelocity: 3,
    jumpHeight: 1,
    jumpVelocity: 4,
  };
  const airborneJump = applyGroundJumpForFrame({
    dt: 0.1,
    player: airbornePlayer,
  });
  const landingPlayer = {
    driftActive: true,
    flightAltitude: 12,
    flightPitch: 0.2,
    flightRoll: -0.1,
    flightVerticalVelocity: 3,
    jumpHeight: 0.1,
    jumpVelocity: -3,
    landingTimer: 0,
    steerInput: 0.4,
  };
  const landingJump = applyGroundJumpForFrame({
    dt: 0.1,
    player: landingPlayer,
  });
  const plainLandingPlayer = {
    driftActive: false,
    jumpHeight: 0.1,
    jumpVelocity: -3,
    landingTimer: 0,
    steerInput: 0.4,
  };
  const plainLandingJump = applyGroundJumpForFrame({
    dt: 0.1,
    player: plainLandingPlayer,
  });
  if (
    !airborneJump.updatedJump ||
    airborneJump.landed ||
    airborneJump.trickBoost ||
    Math.abs(airbornePlayer.jumpHeight - 1.4) > 0.001 ||
    Math.abs(airbornePlayer.jumpVelocity + 1.4) > 0.001 ||
    airbornePlayer.flightAltitude !== 0 ||
    !landingJump.landed ||
    !landingJump.trickBoost ||
    landingJump.trickBoost.seconds !== 0.3 ||
    landingJump.trickBoost.impulse !== 5.5 ||
    landingJump.trickBoost.tier !== 1 ||
    landingJump.trickBoost.source !== 'trick' ||
    landingPlayer.jumpHeight !== 0 ||
    landingPlayer.jumpVelocity !== 0 ||
    landingPlayer.landingTimer !== 0.18 ||
    landingPlayer.flightVerticalVelocity !== 0 ||
    !plainLandingJump.landed ||
    plainLandingJump.trickBoost
  ) {
    fail('Ground jump helper should preserve jump integration, landing reset, flight reset, and drift trick boost request', {
      airborneJump,
      airbornePlayer,
      landingJump,
      landingPlayer,
      plainLandingJump,
      plainLandingPlayer,
    });
  }
  const unknownVehicleRacer = { vehicleMode: 'kart' };
  const unknownVehicleChange = applyVehicleModeChange({
    nextMode: 'submarine',
    racer: unknownVehicleRacer,
    vehicles: VEHICLES,
  });
  const kartOnlyVehicleRacer = { vehicleMode: 'kart' };
  const kartOnlyVehicleChange = applyVehicleModeChange({
    kartOnly: true,
    nextMode: 'hover',
    racer: kartOnlyVehicleRacer,
    vehicles: VEHICLES,
  });
  const lockedVehicleRacer = { switchLockedUntil: 10, vehicleMode: 'kart' };
  const lockedVehicleChange = applyVehicleModeChange({
    nextMode: 'hover',
    racer: lockedVehicleRacer,
    raceTime: 5,
    vehicles: VEHICLES,
  });
  const planeVehicleRacer = {
    flightAltitude: 2,
    flightVerticalVelocity: 8,
    invincibleTimer: 0.1,
    jumpHeight: 1.4,
    jumpVelocity: 5,
    vehicleMode: 'kart',
  };
  const planeVehicleChange = applyVehicleModeChange({
    flightAltitudeLimits: FLIGHT_ALTITUDE_LIMITS,
    force: true,
    nextMode: 'plane',
    racer: planeVehicleRacer,
    vehicles: VEHICLES,
  });
  const groundVehicleRacer = {
    flightAltitude: 22,
    flightPitch: 0.3,
    flightRoll: -0.2,
    flightVerticalVelocity: 7,
    invincibleTimer: 0.8,
    vehicleMode: 'plane',
  };
  const groundVehicleChange = applyVehicleModeChange({
    force: true,
    nextMode: 'kart',
    racer: groundVehicleRacer,
    vehicles: VEHICLES,
  });
  const vehicleIntegrationCalls = [];
  const vehicleIntegrationPlayer = {
    position: new THREE.Vector3(0, 0, 0),
    progress: 0.55,
    switchLockedUntil: 0,
    vehicleMode: 'kart',
    velocity: new THREE.Vector3(10, 0, 0),
  };
  const vehicleIntegrationSwitchPads = [
    { cooldown: 0.05, position: new THREE.Vector3(0.5, 0, 0), radius: 2, targetVehicle: 'hover' },
  ];
  const vehicleIntegrationZones = [
    { action: 'auto-switch', progress: 0.2, radius: 5, vehicle: 'plane' },
    { action: 'block', progress: 0.3, radius: 5, vehicle: 'hover' },
    { action: 'penalty', progress: 0.4, radius: 5, severity: 0.8, vehicle: 'hover' },
    { action: 'auto-switch', active: false, progress: 0.45, radius: 5, vehicle: 'hover' },
  ];
  const vehicleIntegrationLocks = [{ end: 0.6, start: 0.5, vehicle: 'kart' }];
  const vehicleIntegrationFrame = resolveVehicleIntegrationForFrame({
    dt: 0.1,
    hitPlayer: (severity) => vehicleIntegrationCalls.push({ severity, type: 'hit-player' }),
    player: vehicleIntegrationPlayer,
    pointAt: (progress) => ({ point: new THREE.Vector3(progress, 0, 0) }),
    raceTime: 7,
    setVehicleMode: (racer, nextMode, options) => {
      racer.vehicleMode = nextMode;
      vehicleIntegrationCalls.push({ nextMode, options, racer, type: 'set-vehicle' });
    },
    switchPads: vehicleIntegrationSwitchPads,
    vehicleLocks: vehicleIntegrationLocks,
    vehicleZones: vehicleIntegrationZones,
  });
  const skippedVehicleIntegrationFrame = resolveVehicleIntegrationForFrame({
    player: { vehicleMode: 'kart' },
    shouldSkip: true,
  });
  if (
    nextVehicleModeFor('kart', VEHICLE_ORDER) !== 'hover' ||
    nextVehicleModeFor('hover', VEHICLE_ORDER) !== 'plane' ||
    nextVehicleModeFor('plane', VEHICLE_ORDER) !== 'kart' ||
    nextVehicleModeFor('missing', VEHICLE_ORDER) !== 'kart' ||
    unknownVehicleChange.changed ||
    unknownVehicleChange.reason !== 'unknown-vehicle' ||
    unknownVehicleRacer.vehicleMode !== 'kart' ||
    kartOnlyVehicleChange.changed ||
    kartOnlyVehicleChange.reason !== 'kart-only' ||
    kartOnlyVehicleRacer.vehicleMode !== 'kart' ||
    lockedVehicleChange.changed ||
    lockedVehicleChange.reason !== 'switch-locked' ||
    lockedVehicleRacer.vehicleMode !== 'kart' ||
    !planeVehicleChange.changed ||
    planeVehicleRacer.vehicleMode !== 'plane' ||
    planeVehicleRacer.transformTimer !== 0.5 ||
    planeVehicleRacer.invincibleTimer !== 0.5 ||
    planeVehicleRacer.flightAltitude !== FLIGHT_ALTITUDE_LIMITS.cruise ||
    planeVehicleRacer.flightVerticalVelocity !== 0 ||
    planeVehicleRacer.jumpHeight !== 0 ||
    planeVehicleRacer.jumpVelocity !== 0 ||
    !groundVehicleChange.changed ||
    groundVehicleRacer.vehicleMode !== 'kart' ||
    groundVehicleRacer.transformTimer !== 0.5 ||
    groundVehicleRacer.invincibleTimer !== 0.8 ||
    groundVehicleRacer.flightAltitude !== 0 ||
    groundVehicleRacer.flightPitch !== 0 ||
    groundVehicleRacer.flightRoll !== 0 ||
    groundVehicleRacer.flightVerticalVelocity !== 0 ||
    vehicleIntegrationFrame.skipped ||
    vehicleIntegrationFrame.switchPadHits.length !== 1 ||
    vehicleIntegrationSwitchPads[0].cooldown !== 1.2 ||
    vehicleIntegrationFrame.zoneSwitches[0] !== vehicleIntegrationZones[0] ||
    vehicleIntegrationFrame.blockedZones[0] !== vehicleIntegrationZones[1] ||
    vehicleIntegrationFrame.penaltyZones[0] !== vehicleIntegrationZones[2] ||
    vehicleIntegrationFrame.lockHits[0] !== vehicleIntegrationLocks[0] ||
    vehicleIntegrationPlayer.vehicleMode !== 'kart' ||
    Math.abs(vehicleIntegrationPlayer.velocity.length() - 2.8) > 0.001 ||
    Math.abs(vehicleIntegrationPlayer.switchLockedUntil - 7.2) > 0.001 ||
    !vehicleIntegrationCalls.some((entry) => entry.type === 'set-vehicle' && entry.nextMode === 'hover' && entry.options?.force) ||
    !vehicleIntegrationCalls.some((entry) => entry.type === 'set-vehicle' && entry.nextMode === 'plane' && entry.options?.force) ||
    !vehicleIntegrationCalls.some((entry) => entry.type === 'set-vehicle' && entry.nextMode === 'kart' && entry.options?.force) ||
    !vehicleIntegrationCalls.some((entry) => entry.type === 'hit-player' && entry.severity === 0.2) ||
    !vehicleIntegrationCalls.some((entry) => entry.type === 'hit-player' && entry.severity === 0.8) ||
    !skippedVehicleIntegrationFrame.skipped
  ) {
    fail('Vehicle mode helper should preserve mode order, lock gates, plane setup, ground reset behavior, and vehicle integration gates', {
      groundVehicleChange,
      groundVehicleRacer,
      kartOnlyVehicleChange,
      kartOnlyVehicleRacer,
      lockedVehicleChange,
      lockedVehicleRacer,
      planeVehicleChange,
      planeVehicleRacer,
      skippedVehicleIntegrationFrame,
      unknownVehicleChange,
      unknownVehicleRacer,
      vehicleIntegrationCalls,
      vehicleIntegrationFrame,
      vehicleIntegrationPlayer,
      vehicleIntegrationSwitchPads,
    });
  }
  const invincibleHitPlayer = {
    hitTimer: 0,
    invincibleTimer: 0.2,
    jumpHeight: 0,
    shieldTimer: 0,
    velocity: new THREE.Vector3(10, 0, 0),
  };
  const invincibleHit = applyPlayerHitResponse({
    player: invincibleHitPlayer,
    severity: 1,
  });
  const airborneHitPlayer = {
    hitTimer: 0,
    invincibleTimer: 0,
    jumpHeight: 1.2,
    shieldTimer: 0,
    velocity: new THREE.Vector3(10, 0, 0),
  };
  const airborneHit = applyPlayerHitResponse({
    player: airborneHitPlayer,
    severity: 1,
  });
  const shieldHitPlayer = {
    hitTimer: 0,
    invincibleTimer: 0,
    jumpHeight: 0,
    shieldTimer: 1,
    velocity: new THREE.Vector3(10, 0, 0),
  };
  const shieldHit = applyPlayerHitResponse({
    player: shieldHitPlayer,
    severity: 0.5,
  });
  const normalHitPlayer = {
    hitTimer: 0.1,
    invincibleTimer: 0,
    jumpHeight: 0,
    shieldTimer: 0,
    velocity: new THREE.Vector3(10, 0, 0),
  };
  const normalHit = applyPlayerHitResponse({
    player: normalHitPlayer,
    severity: 2,
  });
  const invincibleRival = {
    hitTimer: 0,
    invincibleTimer: 0.2,
    speed: 20,
  };
  const invincibleRivalHit = applyRivalHitResponse({
    rival: invincibleRival,
    severity: 1,
  });
  const normalRival = {
    hitTimer: 0.2,
    invincibleTimer: 0,
    speed: 20,
  };
  const normalRivalHit = applyRivalHitResponse({
    rival: normalRival,
    severity: 1,
  });
  const strongRival = {
    hitTimer: 0,
    invincibleTimer: 0,
    speed: 20,
  };
  const strongRivalHit = applyRivalHitResponse({
    rival: strongRival,
    severity: 5,
  });
  if (
    invincibleHit.applied ||
    invincibleHit.reason !== 'invincible' ||
    invincibleHitPlayer.velocity.length() !== 10 ||
    airborneHit.applied ||
    airborneHit.reason !== 'airborne' ||
    airborneHitPlayer.velocity.length() !== 10 ||
    shieldHit.applied ||
    !shieldHit.shieldBlocked ||
    Math.abs(shieldHitPlayer.shieldTimer - 0.3) > 0.001 ||
    shieldHitPlayer.velocity.length() !== 10 ||
    !normalHit.applied ||
    Math.abs(normalHit.hitTimer - 0.89) > 0.001 ||
    Math.abs(normalHit.velocityMultiplier - 0.56) > 0.001 ||
    Math.abs(normalHitPlayer.velocity.length() - 5.6) > 0.001 ||
    normalHit.cameraShakeTimer !== 0.2 ||
    normalHit.screenFlashTimer !== 0.18 ||
    normalHit.bananaScatterCount !== 3 ||
    normalHit.cue !== 'item-hit' ||
    invincibleRivalHit.applied ||
    invincibleRivalHit.reason !== 'invincible' ||
    invincibleRival.speed !== 20 ||
    !normalRivalHit.applied ||
    Math.abs(normalRival.hitTimer - 0.82) > 0.001 ||
    Math.abs(normalRivalHit.speedMultiplier - 0.64) > 0.001 ||
    Math.abs(normalRival.speed - 12.8) > 0.001 ||
    !strongRivalHit.applied ||
    strongRivalHit.speedMultiplier !== 0.45 ||
    strongRival.speed !== 9
  ) {
    fail('Hit response helpers should preserve invincible, airborne, shield, player hit, and rival hit behavior', {
      airborneHit,
      airborneHitPlayer,
      invincibleHit,
      invincibleHitPlayer,
      invincibleRival,
      invincibleRivalHit,
      normalHit,
      normalHitPlayer,
      normalRival,
      normalRivalHit,
      shieldHit,
      shieldHitPlayer,
      strongRival,
      strongRivalHit,
    });
  }
  const bounds = { maxX: 50, maxZ: 30, minX: -50, minZ: -30 };
  const groundBoundsPlayer = {
    position: new THREE.Vector3(100, 0, 0),
    velocity: new THREE.Vector3(1000, 0, 0),
  };
  const groundBounds = applyPositionBoundsForFrame({
    bounds,
    dt: 0.1,
    isPlane: false,
    player: groundBoundsPlayer,
    roadWidth: 20,
  });
  const planeBoundsPlayer = {
    position: new THREE.Vector3(0, 0, -250),
    velocity: new THREE.Vector3(0, 0, -400),
  };
  const planeBounds = applyPositionBoundsForFrame({
    bounds,
    dt: 0.1,
    isPlane: true,
    player: planeBoundsPlayer,
    roadWidth: 40,
  });
  const insideBoundsPlayer = {
    position: new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(10, 0, 15),
  };
  const insideBounds = applyPositionBoundsForFrame({
    bounds,
    dt: 0.2,
    isPlane: false,
    player: insideBoundsPlayer,
    roadWidth: 10,
  });
  if (
    !groundBounds.moved ||
    !groundBounds.clampedX ||
    groundBounds.clampedZ ||
    groundBounds.margin !== 120 ||
    groundBoundsPlayer.position.x !== 170 ||
    groundBoundsPlayer.velocity.x !== -100 ||
    !planeBounds.clampedZ ||
    planeBounds.margin !== 220 ||
    planeBoundsPlayer.position.z !== -250 ||
    planeBoundsPlayer.velocity.z !== 72 ||
    insideBounds.clampedX ||
    insideBounds.clampedZ ||
    insideBoundsPlayer.position.x !== 2 ||
    insideBoundsPlayer.position.z !== 3 ||
    insideBoundsPlayer.velocity.x !== 10 ||
    insideBoundsPlayer.velocity.z !== 15
  ) {
    fail('Position bounds helper should preserve movement, ground/plane margins, clamping, and bounce damping', {
      groundBounds,
      groundBoundsPlayer,
      insideBounds,
      insideBoundsPlayer,
      planeBounds,
      planeBoundsPlayer,
    });
  }
  const timerPlayer = {
    boostSource: 'pad',
    boostTier: 2,
    boostTimer: 0.1,
    blindTimer: 0.2,
    controlFlipTimer: 0.05,
    driftHopTimer: 0.01,
    ghostTimer: 0.01,
    invincibleTimer: 0.2,
    jumpCooldown: 0.3,
    landingTimer: 0.4,
    liftDisabledTimer: 0.05,
    lightningRodTimer: 0.2,
    magnetTimer: 0.4,
    perfectBoostTimer: 0.03,
    planeBob: 1,
    polarity: -1,
    polaritySwapTimer: 0.02,
    shieldTimer: 0.1,
    transformTimer: 0.5,
    velocity: new THREE.Vector3(3, 0, 4),
  };
  const timerResult = applyPlayerTimersForFrame({
    dt: 0.1,
    forward: new THREE.Vector3(0, 0, 1),
    player: timerPlayer,
  });
  if (
    !timerResult.boostExpired ||
    !timerResult.polarityReset ||
    timerPlayer.boostTimer !== 0 ||
    timerPlayer.boostTier !== 0 ||
    timerPlayer.boostSource !== null ||
    Math.abs(timerPlayer.blindTimer - 0.1) > 0.001 ||
    timerPlayer.controlFlipTimer !== 0 ||
    timerPlayer.ghostTimer !== 0 ||
    Math.abs(timerPlayer.invincibleTimer - 0.1) > 0.001 ||
    Math.abs(timerPlayer.jumpCooldown - 0.2) > 0.001 ||
    timerPlayer.driftHopTimer !== 0 ||
    Math.abs(timerPlayer.landingTimer - 0.3) > 0.001 ||
    timerPlayer.liftDisabledTimer !== 0 ||
    Math.abs(timerPlayer.lightningRodTimer - 0.1) > 0.001 ||
    timerPlayer.shieldTimer !== 0 ||
    Math.abs(timerPlayer.magnetTimer - 0.3) > 0.001 ||
    timerPlayer.perfectBoostTimer !== 0 ||
    timerPlayer.polaritySwapTimer !== 0 ||
    timerPlayer.polarity !== 1 ||
    Math.abs(timerPlayer.transformTimer - 0.4) > 0.001 ||
    Math.abs(timerPlayer.planeBob - 1.4) > 0.001 ||
    timerPlayer.speed !== 4 ||
    timerResult.speed !== 4
  ) {
    fail('Player timer helper should preserve timer decay, boost expiry, polarity reset, plane bob, and speed update', {
      timerPlayer,
      timerResult,
    });
  }
  let accelerationSpeed = 0;
  let accelerationTime = 0;
  let timeToSpeed80 = null;
  let timeToSpeed98 = null;
  const accelerationDt = 0.016;
  while (accelerationTime < 5 && timeToSpeed98 === null) {
    accelerationSpeed = Math.min(
      kart.maxSpeed,
      accelerationSpeed +
        kart.acceleration *
          accelerationMultiplierForSpeed({
            forwardSpeed: accelerationSpeed,
            vehicle: kart,
          }) *
          accelerationDt
    );
    accelerationTime = Number((accelerationTime + accelerationDt).toFixed(3));
    const speedRatio = accelerationSpeed / kart.maxSpeed;
    if (timeToSpeed80 === null && speedRatio >= 0.8) timeToSpeed80 = accelerationTime;
    if (timeToSpeed98 === null && speedRatio >= 0.98) timeToSpeed98 = accelerationTime;
  }
  if (timeToSpeed80 < 1.2 || timeToSpeed80 > 1.8 || timeToSpeed98 < 2.2 || timeToSpeed98 > 3) {
    fail('Kart non-boost acceleration tuning is outside PRD targets', {
      timeToSpeed80,
      timeToSpeed98,
    });
  }
  const normalDriftCharge = driftChargeForFrame({
    charge: 0,
    driftDirection: 1,
    dt: 1,
    speed: 48,
    steerInput: 0.6,
    vehicle: kart,
  });
  const counterSteerCharge = driftChargeForFrame({
    charge: 0,
    driftDirection: 1,
    dt: 1,
    speed: 48,
    steerInput: -0.6,
    vehicle: kart,
  });
  if (normalDriftCharge <= 1.89 || normalDriftCharge >= 1.91 || counterSteerCharge <= normalDriftCharge) {
    fail('Drift charge helper should preserve charge rate and counter-steer bonus', {
      counterSteerCharge,
      normalDriftCharge,
    });
  }
  const sampleDriftTune = {
    boostDuration: [0.55, 0.85, 1.2],
    boostStrength: [12, 17, 23],
    sparkChargeTime: [0.55, 1.3, 2.15],
  };
  const heldDriftRelease = driftReleaseForState({
    charge: 1.35,
    driftActive: true,
    driftHeld: true,
    driftTune: sampleDriftTune,
    speed: 48,
  });
  const tierTwoDriftRelease = driftReleaseForState({
    charge: 1.35,
    driftActive: true,
    driftHeld: false,
    driftTune: sampleDriftTune,
    speed: 48,
  });
  const lowSpeedDriftRelease = driftReleaseForState({
    charge: 0.3,
    driftActive: true,
    driftHeld: true,
    driftTune: sampleDriftTune,
    speed: 7.5,
  });
  if (
    heldDriftRelease.shouldRelease ||
    !tierTwoDriftRelease.shouldRelease ||
    !tierTwoDriftRelease.shouldBoost ||
    tierTwoDriftRelease.tier !== 2 ||
    tierTwoDriftRelease.boostDuration !== 0.85 ||
    tierTwoDriftRelease.boostStrength !== 17 ||
    tierTwoDriftRelease.source !== 'drift' ||
    !lowSpeedDriftRelease.shouldRelease ||
    lowSpeedDriftRelease.shouldBoost
  ) {
    fail('Drift release helper should preserve release gates and tiered mini-turbo mapping', {
      heldDriftRelease,
      lowSpeedDriftRelease,
      tierTwoDriftRelease,
    });
  }
  const normalTurnInput = steeringTurnInputForState({
    driftActive: false,
    steerInput: 0.5,
    vehicle: kart,
  });
  const driftTurnInput = steeringTurnInputForState({
    driftActive: true,
    driftDirection: 1,
    steerInput: 0.5,
    vehicle: kart,
  });
  if (normalTurnInput !== 0.5 || driftTurnInput <= kart.driftTurn) {
    fail('Steering turn input helper should preserve normal and drift turn composition', {
      driftTurnInput,
      normalTurnInput,
    });
  }
  const lowSpeedTurn = steeringTurnSpeedForState({
    signedForwardSpeed: kart.maxSpeed * 0.3,
    vehicle: kart,
    vehicleMode: 'kart',
  });
  const highSpeedTurn = steeringTurnSpeedForState({
    signedForwardSpeed: kart.maxSpeed * 0.8,
    vehicle: kart,
    vehicleMode: 'kart',
  });
  if (
    lowSpeedTurn < 0.65 ||
    lowSpeedTurn > 0.68 ||
    highSpeedTurn < 0.9 ||
    highSpeedTurn > 0.93
  ) {
    fail('Kart steering turn-speed helper should preserve tuned low-speed control and high-speed arcade response', {
      highSpeedTurn,
      lowSpeedTurn,
    });
  }
  const stoppedHeadingDelta = headingDeltaForFrame({
    controlsThrottle: 0,
    dt: 0.016,
    speed: 0.2,
    steerInput: 1,
    vehicle: kart,
    vehicleMode: 'kart',
  });
  const movingHeadingDelta = headingDeltaForFrame({
    controlsThrottle: 1,
    dt: 0.016,
    signedForwardSpeed: kart.maxSpeed * 0.8,
    speed: kart.maxSpeed * 0.8,
    steerInput: 1,
    vehicle: kart,
    vehicleMode: 'kart',
  });
  if (stoppedHeadingDelta !== 0 || movingHeadingDelta <= 0.043 || movingHeadingDelta >= 0.047) {
    fail('Heading delta helper should preserve movement gate and tuned arcade kart steering delta', {
      movingHeadingDelta,
      stoppedHeadingDelta,
    });
  }
  const lateralRight = new THREE.Vector3(1, 0, 0);
  const normalGripPlayer = {
    driftActive: false,
    velocity: new THREE.Vector3(10, 0, 20),
  };
  const normalGrip = applyLateralGripForFrame({
    dt: 0.016,
    player: normalGripPlayer,
    right: lateralRight,
    speed: 40,
    vehicle: kart,
  });
  const driftGripPlayer = {
    driftActive: true,
    driftDirection: 1,
    velocity: new THREE.Vector3(10, 0, 20),
  };
  const driftGrip = applyLateralGripForFrame({
    dt: 0.016,
    player: driftGripPlayer,
    right: lateralRight,
    speed: 45,
    vehicle: kart,
  });
  const leftDriftGripPlayer = {
    driftActive: true,
    driftDirection: -1,
    velocity: new THREE.Vector3(10, 0, 20),
  };
  const leftDriftGrip = applyLateralGripForFrame({
    dt: 0.016,
    player: leftDriftGripPlayer,
    right: lateralRight,
    speed: 45,
    vehicle: kart,
  });
  if (
    !normalGrip.applied ||
    normalGrip.driftSlipImpulse !== 0 ||
    Math.abs(normalGrip.gripBlend - 0.2528) > 0.001 ||
    Math.abs(normalGripPlayer.velocity.x - 7.472) > 0.001 ||
    Math.abs(normalGripPlayer.velocity.z - 20) > 0.001 ||
    Math.abs(driftGrip.gripBlend - 0.0648) > 0.001 ||
    Math.abs(driftGrip.driftSlipImpulse - 0.192192) > 0.001 ||
    Math.abs(driftGripPlayer.velocity.x - 9.544192) > 0.001 ||
    Math.abs(leftDriftGrip.driftSlipImpulse + 0.192192) > 0.001 ||
    Math.abs(leftDriftGripPlayer.velocity.x - 9.159808) > 0.001
  ) {
    fail('Lateral grip helper should preserve normal grip damping and directional drift slip impulse', {
      driftGrip,
      driftGripPlayer,
      leftDriftGrip,
      leftDriftGripPlayer,
      normalGrip,
      normalGripPlayer,
    });
  }
  const roadAssistPlayer = {
    driftActive: false,
    heading: 0.4,
    jumpHeight: 0,
    steerInput: 0.05,
    velocity: new THREE.Vector3(10, 0, 2),
  };
  const roadAssist = applyRoadAssistForFrame({
    activeRoadWidth: 20,
    controlsThrottle: 1,
    dt: 0.016,
    isPlane: false,
    nearest: {
      distance: 10,
      normal: new THREE.Vector3(1, 0, 0),
      tangent: new THREE.Vector3(0, 0, 1),
    },
    player: roadAssistPlayer,
    speed: 40,
  });
  const planeAssistPlayer = {
    driftActive: false,
    heading: 0.4,
    jumpHeight: 0,
    steerInput: 0.05,
    velocity: new THREE.Vector3(10, 0, 2),
  };
  const planeRoadAssist = applyRoadAssistForFrame({
    activeRoadWidth: 20,
    controlsThrottle: 1,
    dt: 0.016,
    isPlane: true,
    nearest: {
      distance: 10,
      normal: new THREE.Vector3(1, 0, 0),
      tangent: new THREE.Vector3(0, 0, 1),
    },
    player: planeAssistPlayer,
    speed: 40,
  });
  if (
    !roadAssist.applied ||
    Math.abs(roadAssist.edgeAssist - 0.9375) > 0.001 ||
    Math.abs(roadAssist.cruiseAssist - 0.62) > 0.001 ||
    Math.abs(roadAssist.assistStrength - 1.65125) > 0.001 ||
    Math.abs(roadAssist.headingCorrection + 0.010568) > 0.001 ||
    Math.abs(roadAssist.recenter - 0.695652) > 0.001 ||
    Math.abs(roadAssist.velocityLerp - 0.02025) > 0.001 ||
    Math.abs(roadAssistPlayer.heading - 0.389432) > 0.001 ||
    Math.abs(roadAssistPlayer.velocity.x - 9.419065) > 0.001 ||
    planeRoadAssist.applied ||
    Math.abs(planeAssistPlayer.heading - 0.4) > 0.001 ||
    Math.abs(planeAssistPlayer.velocity.x - 10) > 0.001
  ) {
    fail('Road assist helper should preserve heading blend, tangent velocity guide, recentering, and plane suppression', {
      planeAssistPlayer,
      planeRoadAssist,
      roadAssist,
      roadAssistPlayer,
    });
  }
  const boundaryPlayer = {
    jumpHeight: 0,
    shieldTimer: 0,
    vehicleMode: 'kart',
    velocity: new THREE.Vector3(8, 0, 10),
  };
  const boundary = applyTrackBoundaryForFrame({
    activeRoadWidth: 20,
    dt: 0.016,
    isPlane: false,
    nearest: {
      distance: 24,
      normal: new THREE.Vector3(1, 0, 0),
      tangent: new THREE.Vector3(0, 0, 1),
    },
    player: boundaryPlayer,
  });
  const shieldedBoundaryPlayer = {
    jumpHeight: 0,
    shieldTimer: 1,
    vehicleMode: 'kart',
    velocity: new THREE.Vector3(8, 0, 10),
  };
  const shieldedBoundary = applyTrackBoundaryForFrame({
    activeRoadWidth: 20,
    dt: 0.016,
    isPlane: false,
    nearest: {
      distance: 14,
      normal: new THREE.Vector3(1, 0, 0),
      tangent: new THREE.Vector3(0, 0, 1),
    },
    player: shieldedBoundaryPlayer,
  });
  const hoverBoundaryPlayer = {
    jumpHeight: 0,
    shieldTimer: 0,
    vehicleMode: 'hover',
    velocity: new THREE.Vector3(8, 0, 10),
  };
  const hoverBoundary = applyTrackBoundaryForFrame({
    activeRoadWidth: 20,
    dt: 0.016,
    isPlane: false,
    nearest: {
      distance: 22,
      normal: new THREE.Vector3(1, 0, 0),
      tangent: new THREE.Vector3(0, 0, 1),
    },
    player: hoverBoundaryPlayer,
  });
  const planeBoundaryPlayer = {
    jumpHeight: 0,
    shieldTimer: 0,
    vehicleMode: 'kart',
    velocity: new THREE.Vector3(8, 0, 10),
  };
  const planeBoundary = applyTrackBoundaryForFrame({
    activeRoadWidth: 20,
    dt: 0.016,
    isPlane: true,
    nearest: {
      distance: 24,
      normal: new THREE.Vector3(1, 0, 0),
      tangent: new THREE.Vector3(0, 0, 1),
    },
    player: planeBoundaryPlayer,
  });
  if (
    !boundary.applied ||
    Math.abs(boundary.edge - 1) > 0.001 ||
    Math.abs(boundary.dragMultiplier - 0.97104) > 0.001 ||
    Math.abs(boundary.returnStrength - 0.208333) > 0.001 ||
    Math.abs(boundary.outwardDamping - 0.72) > 0.001 ||
    Math.abs(boundary.returnLerp - 0.025933) > 0.001 ||
    Math.abs(boundaryPlayer.velocity.x - 1.985709) > 0.001 ||
    Math.abs(boundaryPlayer.velocity.z - 9.7104) > 0.001 ||
    Math.abs(shieldedBoundary.edge - 0.363636) > 0.001 ||
    shieldedBoundary.dragMultiplier !== 1 ||
    Math.abs(shieldedBoundaryPlayer.velocity.x - 8) > 0.001 ||
    Math.abs(hoverBoundary.guideLimit - 23.6) > 0.001 ||
    hoverBoundary.edge >= boundary.edge ||
    planeBoundary.applied ||
    Math.abs(planeBoundaryPlayer.velocity.x - 8) > 0.001
  ) {
    fail('Track boundary helper should preserve edge drag, return guide, hover width, shield gate, and plane suppression', {
      boundary,
      boundaryPlayer,
      hoverBoundary,
      planeBoundary,
      planeBoundaryPlayer,
      shieldedBoundary,
      shieldedBoundaryPlayer,
    });
  }
  const tier = driftTierForCharge(1.35, { sparkChargeTime: [0.55, 1.3, 2.15] });
  if (tier !== 2) fail('Drift charge should resolve to the expected spark tier', { tier });
  const sparkTier = driftSparkTierForCharge(1.35, { sparkChargeTime: [0.55, 1.3, 2.15] });
  if (sparkTier !== 2 || driftSparkColorForTier(sparkTier) !== '#ffd34f') {
    fail('Drift spark VFX helper should preserve tier color mapping', {
      color: driftSparkColorForTier(sparkTier),
      sparkTier,
    });
  }
  const sparkFrame = driftSparkFrameFor({ now: 0, phase: 0, side: -1, sparkIndex: 2, tier: 2 });
  const trailFrame = driftTrailFrameFor({ now: 0, side: -1, tier: 2, trailIndex: 0 });
  if (
    sparkFrame.color !== '#ffd34f' ||
    Math.abs(sparkFrame.emissiveIntensity - 1.08) > 0.001 ||
    Math.abs(sparkFrame.scale - 1.14) > 0.001 ||
    sparkFrame.x >= -4.2 ||
    sparkFrame.y <= 1.15 ||
    trailFrame.color !== '#49d9ff' ||
    trailFrame.opacity < 0.46 ||
    trailFrame.x >= -2.8 ||
    trailFrame.z >= -6.6
  ) {
    fail('Drift spark VFX frame helper should preserve spark animation and trail values', { sparkFrame, trailFrame });
  }
  const boostFlameFrame = boostFlamePresentationFrameFor({ boostTimer: 0.03 });
  const boostFlameOffFrame = boostFlamePresentationFrameFor({ boostTimer: 0.02 });
  const forcedBoostFlameFrame = boostFlamePresentationFrameFor({ boostTimer: 0, visible: true });
  const boostFlameGroup = {
    children: [
      { material: { opacity: 0 }, scale: { z: 1 }, userData: { kind: 'boost-burst-streak' }, visible: false },
      {
        material: { opacity: 0 },
        rotation: { z: 0 },
        scale: { setScalar: (value) => { boostFlameGroup.haloScaleValue = value; } },
        userData: { kind: 'boost-burst-halo' },
        visible: false,
      },
    ],
    visible: false,
  };
  const appliedBoostFlameFrame = applyBoostFlameGroupFrame({ boostTimer: 0.04, group: boostFlameGroup, now: 90 });
  const shieldFrame = shieldPresentationFrameFor({ now: 130, shieldTimer: 1.1 });
  const shieldOffFrame = shieldPresentationFrameFor({ shieldTimer: 0.01 });
  const shieldGroup = {
    children: [
      { material: { opacity: 0 } },
      { material: { opacity: 0 }, rotation: { y: 0 } },
      {
        children: [
          { material: { opacity: 0 }, userData: { kind: 'shield-burst-halo' } },
          { material: { opacity: 0 }, rotation: { y: 0 }, userData: { kind: 'shield-burst-spark' } },
        ],
        rotation: { y: 0 },
        scale: { setScalar: (value) => { shieldGroup.burstScaleValue = value; } },
        userData: { kind: 'shield-burst-crown' },
        visible: false,
      },
    ],
    scale: { setScalar: (value) => { shieldGroup.scaleValue = value; } },
    visible: false,
  };
  const appliedShieldFrame = applyShieldGroupFrame({ group: shieldGroup, now: 130, shieldTimer: 1.1 });
  if (
    !boostFlameFrame.visible ||
    boostFlameOffFrame.visible ||
    !forcedBoostFlameFrame.visible ||
    !appliedBoostFlameFrame.visible ||
    !boostFlameGroup.visible ||
    appliedBoostFlameFrame.burstStreakOpacity < 0.34 ||
    !boostFlameGroup.children[0].visible ||
    boostFlameGroup.children[0].material.opacity < 0.34 ||
    boostFlameGroup.children[0].scale.z <= 1 ||
    !boostFlameGroup.children[1].visible ||
    boostFlameGroup.children[1].material.opacity < 0.42 ||
    boostFlameGroup.children[1].rotation.z <= 0.08 ||
    !shieldFrame.visible ||
    shieldOffFrame.visible ||
    !appliedShieldFrame.visible ||
    !shieldGroup.visible ||
    shieldFrame.opacity < 0.44 ||
    shieldFrame.ringOpacity < 0.88 ||
    shieldFrame.burstOpacity < 0.7 ||
    shieldFrame.burstScale < 1 ||
    shieldFrame.scale < 1.1 ||
    shieldGroup.children[0].material.opacity < 0.44 ||
    shieldGroup.children[1].material.opacity < 0.88 ||
    shieldGroup.children[1].rotation.y <= 0.04 ||
    !shieldGroup.children[2].visible ||
    shieldGroup.children[2].rotation.y <= 0.07 ||
    shieldGroup.burstScaleValue < 1 ||
    shieldGroup.children[2].children.some((child) => child.material.opacity <= 0.4)
  ) {
    fail('Boost flame and shield VFX helpers should preserve timer thresholds, explicit visibility, and group mutation', {
      appliedBoostFlameFrame,
      appliedShieldFrame,
      boostFlameFrame,
      boostFlameGroup,
      boostFlameOffFrame,
      forcedBoostFlameFrame,
      shieldFrame,
      shieldGroup,
      shieldOffFrame,
    });
  }
  const playerVehicleFrame = playerVehiclePresentationFrameFor({
    dt: 0.1,
    player: {
      boostTimer: 0.2,
      driftActive: true,
      driftDirection: 1,
      heading: 0.8,
      jumpHeight: 0.4,
      speed: 12,
      steerInput: -0.5,
      vehicleMode: 'kart',
      velocity: new THREE.Vector3(30, 0, 0),
    },
    vehicle: { hover: 0.35, maxSpeed: 60 },
  });
  const planeVehicleFrame = playerVehiclePresentationFrameFor({
    dt: 0.1,
    player: {
      flightAltitude: 17,
      flightPitch: -0.2,
      flightRoll: 0.3,
      planeBob: Math.PI / 2,
      speed: 20,
      vehicleMode: 'plane',
      velocity: new THREE.Vector3(20, 0, 0),
    },
    vehicle: { maxSpeed: 40 },
  });
  const switchRingFrame = switchRingFrameFor({ dt: 0.1, transformTimer: 0.25 });
  const rivalFrame = rivalVehiclePresentationFrameFor({
    defaultVehicle: 'kart',
    dt: 0.1,
    flightCruiseAltitude: 17,
    now: 70,
    rival: {
      hitTimer: 0.2,
      speed: 18,
      vehicleMode: 'hover',
      wobble: 1,
    },
    sample: { tangent: new THREE.Vector3(1, 0, 0) },
  });
  if (
    Math.abs(playerVehicleFrame.y - 1.23) > 0.001 ||
    Math.abs(playerVehicleFrame.rotationX) > 0.001 ||
    Math.abs(playerVehicleFrame.rotationZ + 0.05) > 0.001 ||
    !playerVehicleFrame.boostFlame?.visible ||
    !playerVehicleFrame.boostFlameVisible ||
    Math.abs(playerVehicleFrame.frontWheelRotationY + 0.18) > 0.001 ||
    Math.abs(playerVehicleFrame.wheelRotationXDelta - 2.64) > 0.001 ||
    Math.abs(planeVehicleFrame.y - 17.83) > 0.001 ||
    planeVehicleFrame.rotationX !== -0.2 ||
    planeVehicleFrame.rotationZ !== 0.3 ||
    !switchRingFrame.visible ||
    Math.abs(switchRingFrame.rotationZDelta - 0.8) > 0.001 ||
    Math.abs(switchRingFrame.scale - 1.2) > 0.001 ||
    Math.abs(switchRingFrame.opacity - 0.5) > 0.001 ||
    rivalFrame.vehicleMode !== 'hover' ||
    Math.abs(rivalFrame.y - 1.67) > 0.001 ||
    Math.abs(rivalFrame.rotationY - Math.PI / 2) > 0.001 ||
    Math.abs(rivalFrame.rotationZ - Math.sin(1) * 0.18) > 0.001 ||
    Math.abs(rivalFrame.wheelRotationXDelta - 2.88) > 0.001 ||
    rivalFrame.boostFlame?.visible ||
    rivalFrame.boostFlameVisible
  ) {
    fail('Vehicle presentation VFX helpers should preserve current mesh pose, switch ring, wheel, and flame values', {
      planeVehicleFrame,
      playerVehicleFrame,
      rivalFrame,
      switchRingFrame,
    });
  }
  const trackBananaFrame = trackBananaPresentationFrameFor({
    banana: { cooldown: 0 },
    dt: 0.1,
    index: 1,
    now: 0,
  });
  const coolingTrackBananaFrame = trackBananaPresentationFrameFor({
    banana: { cooldown: 0.2 },
    dt: 0.1,
    index: 0,
    now: 0,
  });
  const itemBoxFrame = itemBoxPresentationFrameFor({
    box: { cooldown: 0 },
    dt: 0.1,
    index: 2,
    now: 0,
  });
  const visibleBoostPadFrame = boostPadPresentationFrameFor({
    now: 0,
    zipper: { cooldown: 0 },
  });
  const coolingBoostPadFrame = boostPadPresentationFrameFor({
    now: 70,
    zipper: { cooldown: 0.8 },
  });
  const activeFlightGateFrame = flightGatePresentationFrameFor({
    active: true,
    gate: { altitude: 10, cooldown: 0.2 },
    index: 0,
    now: 0,
  });
  const inactiveFlightGateFrame = flightGatePresentationFrameFor({
    active: false,
    gate: { altitude: 10, cooldown: 0 },
    index: 1,
    now: 0,
  });
  const coolingSwitchPadFrame = switchPadPresentationFrameFor({
    dt: 0.1,
    index: 0,
    now: 0,
    pad: { cooldown: 0.2 },
  });
  const readySwitchPadFrame = switchPadPresentationFrameFor({
    dt: 0.1,
    index: 1,
    now: 0,
    pad: { cooldown: 0 },
  });
  const activeHazardFrame = trackHazardPresentationFrameFor({
    active: true,
    dt: 0.1,
    hazard: {},
    index: 0,
    now: 0,
  });
  const telegraphHazardFrame = trackHazardPresentationFrameFor({
    active: false,
    dt: 0.1,
    hazard: { telegraphTime: 0.2 },
    index: 0,
    now: 0,
  });
  const trapFrame = trapPresentationFrameFor({ hazard: { life: 3 } });
  const expiredTrapFrame = trapPresentationFrameFor({ hazard: { life: 0 } });
  const droppedBananaFrame = droppedBananaPresentationFrameFor({
    banana: { life: 1 },
    dt: 0.1,
    now: 0,
  });
  if (
    !trackBananaFrame.visible ||
    Math.abs(trackBananaFrame.rotationYDelta - 0.18) > 0.001 ||
    Math.abs(trackBananaFrame.y - (1.25 + Math.sin(1) * 0.16)) > 0.001 ||
    coolingTrackBananaFrame.visible ||
    !itemBoxFrame.visible ||
    Math.abs(itemBoxFrame.rotationYDelta - 0.09) > 0.001 ||
    Math.abs(itemBoxFrame.y - (3.5 + Math.sin(2) * 0.22)) > 0.001 ||
    !visibleBoostPadFrame.visible ||
    !visibleBoostPadFrame.visualActive ||
    visibleBoostPadFrame.chevronOpacity <= coolingBoostPadFrame.chevronOpacity ||
    !coolingBoostPadFrame.visible ||
    !coolingBoostPadFrame.visualActive ||
    coolingBoostPadFrame.centerStripeOpacity !== 0.48 ||
    !activeFlightGateFrame.groupVisible ||
    activeFlightGateFrame.scale !== 1.12 ||
    activeFlightGateFrame.ringOpacity !== 0.28 ||
    activeFlightGateFrame.glowOpacity !== 0.08 ||
    inactiveFlightGateFrame.groupVisible ||
    inactiveFlightGateFrame.ringOpacity !== 0.32 ||
    Math.abs(coolingSwitchPadFrame.rotationYDelta - 0.24) > 0.001 ||
    coolingSwitchPadFrame.scale !== 0.82 ||
    Math.abs(readySwitchPadFrame.rotationYDelta - 0.07) > 0.001 ||
    Math.abs(readySwitchPadFrame.scale - (1 + Math.sin(1) * 0.04)) > 0.001 ||
    !activeHazardFrame.visible ||
    Math.abs(activeHazardFrame.rotationYDelta - 0.08) > 0.001 ||
    activeHazardFrame.scale !== 1.05 ||
    activeHazardFrame.opacity !== 0.86 ||
    !telegraphHazardFrame.visible ||
    telegraphHazardFrame.scale !== 0.72 ||
    telegraphHazardFrame.opacity !== 0.38 ||
    !trapFrame.visible ||
    trapFrame.opacity !== 0.5 ||
    expiredTrapFrame.visible ||
    expiredTrapFrame.opacity !== 0.15 ||
    !droppedBananaFrame.visible ||
    Math.abs(droppedBananaFrame.rotationYDelta - 0.18) > 0.001 ||
    Math.abs(droppedBananaFrame.y - 1.08) > 0.001
  ) {
    fail('World pickup and hazard VFX helpers should preserve current visibility, bob, pulse, opacity, and spin values', {
      activeFlightGateFrame,
      activeHazardFrame,
      coolingSwitchPadFrame,
      coolingBoostPadFrame,
      coolingTrackBananaFrame,
      droppedBananaFrame,
      expiredTrapFrame,
      inactiveFlightGateFrame,
      itemBoxFrame,
      readySwitchPadFrame,
      telegraphHazardFrame,
      trackBananaFrame,
      trapFrame,
      visibleBoostPadFrame,
    });
  }
  const basicRaceMaterial = createBasicMaterial('#123456');
  const vehicleModel = createVehicleModel({
    accent: '#00ffff',
    color: '#ff0000',
    scale: 0.82,
    suit: '#111111',
  });
  vehicleModel.setMode('plane');
  const planeWheelParentVisible = vehicleModel.wheels[0].parent.visible;
  vehicleModel.setMode('kart');
  const kartWheelParentVisible = vehicleModel.wheels[0].parent.visible;
  const frontWheelCount = vehicleModel.wheels.filter((wheel) => wheel.userData.front).length;
  const vehicleBoostBurstHalo = vehicleModel.boostFlame.children.find((child) => child.userData?.kind === 'boost-burst-halo');
  const vehicleBoostBurstStreaks = vehicleModel.boostFlame.children.filter((child) => child.userData?.kind === 'boost-burst-streak');
  const vehicleShieldShell = vehicleModel.shieldGroup.children[0];
  const vehicleShieldRing = vehicleModel.shieldGroup.children[1];
  const vehicleShieldBurst = vehicleModel.shieldGroup.children[2];
  const vehicleShieldBurstHalo = vehicleShieldBurst?.children.find((child) => child.userData?.kind === 'shield-burst-halo');
  const vehicleShieldBurstSparks = vehicleShieldBurst?.children.filter((child) => child.userData?.kind === 'shield-burst-spark') || [];
  const vehicleShieldBurstFlashes = vehicleShieldBurst?.children.filter((child) => child.userData?.kind === 'shield-burst-flash') || [];
  if (
    basicRaceMaterial.color.getHexString() !== '123456' ||
    !basicRaceMaterial.flatShading ||
    basicRaceMaterial.metalness !== 0.02 ||
    basicRaceMaterial.roughness !== 0.68 ||
    Math.abs(vehicleModel.group.scale.x - 0.82) > 0.001 ||
    vehicleModel.wheels.length !== 4 ||
    frontWheelCount !== 2 ||
    vehicleModel.wheels.some((wheel) => wheel.children.length !== 3) ||
    vehicleModel.boostFlame.children.length !== 5 ||
    vehicleBoostBurstStreaks.length !== 2 ||
    vehicleBoostBurstStreaks.some((streak) => streak.material.depthTest || streak.geometry.parameters.depth !== 8.8) ||
    vehicleBoostBurstHalo?.geometry?.parameters?.radius !== 3.2 ||
    vehicleBoostBurstHalo?.material?.depthTest ||
    vehicleModel.driftSparkGroup.children.length !== 10 ||
    vehicleModel.driftSparkGroup.children.filter((child) => child.userData.kind === 'drift-trail-visual').length !== 2 ||
    vehicleModel.shieldGroup.children.length !== 3 ||
    vehicleModel.shieldGroup.userData.kind !== 'shield-visual' ||
    vehicleShieldShell.geometry.parameters.radius !== 7.35 ||
    vehicleShieldShell.material.opacity !== 0.36 ||
    Math.abs(vehicleShieldShell.scale.x - 1.12) > 0.001 ||
    Math.abs(vehicleShieldShell.scale.y - 0.64) > 0.001 ||
    Math.abs(vehicleShieldShell.scale.z - 1.26) > 0.001 ||
    vehicleShieldRing.geometry.parameters.radius !== 7.15 ||
    vehicleShieldRing.geometry.parameters.tube !== 0.32 ||
    vehicleShieldRing.material.opacity !== 0.88 ||
    vehicleShieldRing.material.depthTest ||
    vehicleShieldRing.rotation.x !== 0 ||
    vehicleShieldBurst?.userData?.kind !== 'shield-burst-crown' ||
    vehicleShieldBurstHalo?.geometry?.parameters?.radius !== 4.2 ||
    vehicleShieldBurstHalo?.material?.depthTest ||
    vehicleShieldBurstSparks.length !== 5 ||
    vehicleShieldBurstSparks.some((spark) => spark.material.depthTest || spark.geometry.parameters.radius < 0.7) ||
    vehicleShieldBurstFlashes.length !== 2 ||
    vehicleShieldBurstFlashes.some((flash) => flash.material.depthTest || flash.geometry.parameters.width !== 5.2) ||
    planeWheelParentVisible ||
    !kartWheelParentVisible ||
    vehicleModel.boostFlame.visible ||
    vehicleModel.driftSparkGroup.visible ||
    vehicleModel.shieldGroup.visible
  ) {
    fail('Extracted race vehicle model helper should preserve material defaults, wheel groups, mode toggles, boost flame, drift spark, and shield structure', {
      basicRaceMaterial: {
        color: basicRaceMaterial.color.getHexString(),
        flatShading: basicRaceMaterial.flatShading,
        metalness: basicRaceMaterial.metalness,
        roughness: basicRaceMaterial.roughness,
      },
      frontWheelCount,
      kartWheelParentVisible,
      planeWheelParentVisible,
      vehicleModel: {
        boostFlames: vehicleModel.boostFlame.children.length,
        boostBurstHaloDepthTest: vehicleBoostBurstHalo?.material?.depthTest,
        boostBurstHaloRadius: vehicleBoostBurstHalo?.geometry?.parameters?.radius,
        boostBurstStreaks: vehicleBoostBurstStreaks.length,
        driftSparks: vehicleModel.driftSparkGroup.children.length,
        driftTrails: vehicleModel.driftSparkGroup.children.filter((child) => child.userData.kind === 'drift-trail-visual').length,
        shieldBurstChildren: vehicleShieldBurst?.children.length,
        shieldBurstHaloDepthTest: vehicleShieldBurstHalo?.material?.depthTest,
        shieldBurstHaloRadius: vehicleShieldBurstHalo?.geometry?.parameters?.radius,
        shieldBurstFlashes: vehicleShieldBurstFlashes.length,
        shieldBurstSparks: vehicleShieldBurstSparks.length,
        shieldChildren: vehicleModel.shieldGroup.children.length,
        shieldRingDepthTest: vehicleShieldRing.material.depthTest,
        shieldRingOpacity: vehicleShieldRing.material.opacity,
        shieldRingRadius: vehicleShieldRing.geometry.parameters.radius,
        shieldRingTube: vehicleShieldRing.geometry.parameters.tube,
        shieldRingRotationX: vehicleShieldRing.rotation.x,
        shieldShellOpacity: vehicleShieldShell.material.opacity,
        shieldShellRadius: vehicleShieldShell.geometry.parameters.radius,
        shieldShellScale: vehicleShieldShell.scale,
        scale: vehicleModel.group.scale.x,
        wheels: vehicleModel.wheels.length,
      },
    });
  }

  const switchRingMesh = createVehicleSwitchRing();
  const vehicleWorld = new THREE.Group();
  const vehicleMeshes = createRaceVehicleMeshes({
    defaultVehicle: 'plane',
    profile: { avatar: { suit: '#445566' } },
    race: {
      player: { vehicleMode: 'hover' },
      rivals: [
        { accent: '#00ff00', color: '#ff0000' },
        { accent: '#0000ff', color: '#ffff00' },
      ],
    },
    world: vehicleWorld,
  });
  const playerWheelParentVisible = vehicleMeshes.playerVehicle.wheels[0].parent.visible;
  const playerHoverGroup = vehicleMeshes.playerVehicle.group.children.find(
    (child) => child.type === 'Group' && child.visible && child.children.some((entry) => entry.geometry?.type === 'TorusGeometry')
  );
  const playerRearNumberPlate = vehicleMeshes.playerVehicle.group.children.find(
    (child) => child.userData?.kind === 'player-rear-number-plate'
  );
  const playerRearNumberStrokes = vehicleMeshes.playerVehicle.group.children.filter(
    (child) => child.userData?.kind === 'player-rear-number-stroke'
  );
  const rivalWheelParentVisible = vehicleMeshes.rivalModels[0].wheels[0].parent.visible;
  const lightweightRival = createRivalKartModel({ accent: '#00ff00', color: '#ff0000', scale: 0.48 });
  let lightweightRivalMeshCount = 0;
  let lightweightRivalTriangles = 0;
  lightweightRival.group.traverse((object) => {
    if (!object.isMesh) return;
    lightweightRivalMeshCount += 1;
    const indexCount = object.geometry?.index?.count || 0;
    const positionCount = object.geometry?.attributes?.position?.count || 0;
    lightweightRivalTriangles += indexCount ? indexCount / 3 : positionCount ? positionCount / 3 : 0;
  });
  lightweightRival.setMode('plane');
  const lightweightRivalPlaneWheelsVisible = lightweightRival.wheels[0].parent.visible;
  lightweightRival.setMode('kart');
  const lightweightRivalKartWheelsVisible = lightweightRival.wheels[0].parent.visible;
  if (
    switchRingMesh.geometry.type !== 'TorusGeometry' ||
    switchRingMesh.geometry.parameters.radius !== 7.2 ||
    switchRingMesh.geometry.parameters.tube !== 0.28 ||
    switchRingMesh.material.color.getHexString() !== 'ffd34f' ||
    switchRingMesh.material.depthWrite ||
    switchRingMesh.material.opacity !== 0.75 ||
    !switchRingMesh.material.transparent ||
    switchRingMesh.rotation.x !== Math.PI / 2 ||
    switchRingMesh.visible ||
    vehicleMeshes.playerVehicle.group.parent !== vehicleWorld ||
    Math.abs(vehicleMeshes.playerVehicle.group.scale.x - 0.96) > 0.001 ||
    !playerWheelParentVisible ||
    !playerHoverGroup ||
    !playerRearNumberPlate ||
    playerRearNumberPlate.matrixAutoUpdate ||
    playerRearNumberPlate.geometry.parameters.width !== 2.36 ||
    playerRearNumberStrokes.length !== 2 ||
    playerRearNumberStrokes.some((stroke) => stroke.matrixAutoUpdate || stroke.geometry.parameters.width !== 0.24) ||
    vehicleMeshes.playerVehicle.shieldGroup.children.length !== 3 ||
    vehicleMeshes.playerVehicle.shieldGroup.userData.kind !== 'shield-visual' ||
    vehicleMeshes.playerVehicle.shieldGroup.children[0].geometry.parameters.radius !== 7.35 ||
    vehicleMeshes.playerVehicle.shieldGroup.children[1].geometry.parameters.radius !== 7.15 ||
    vehicleMeshes.playerVehicle.shieldGroup.children[1].geometry.parameters.tube !== 0.32 ||
    vehicleMeshes.playerVehicle.shieldGroup.children[1].material.depthTest ||
    vehicleMeshes.playerVehicle.shieldGroup.children[1].rotation.x !== 0 ||
    vehicleMeshes.playerVehicle.shieldGroup.children[2].userData.kind !== 'shield-burst-crown' ||
    vehicleMeshes.playerVehicle.shieldGroup.children[2].children.filter((child) => child.userData?.kind === 'shield-burst-spark').length !== 5 ||
    vehicleMeshes.playerVehicle.shieldGroup.children[2].children.filter((child) => child.userData?.kind === 'shield-burst-flash').length !== 2 ||
    vehicleMeshes.playerVehicle.shieldGroup.visible ||
    vehicleMeshes.switchRing.parent !== vehicleMeshes.playerVehicle.group ||
    vehicleMeshes.rivalModels.length !== 2 ||
    vehicleMeshes.rivalModels.some((model) => model.group.parent !== vehicleWorld) ||
    Math.abs(vehicleMeshes.rivalModels[0].group.scale.x - 0.58) > 0.001 ||
    rivalWheelParentVisible ||
    lightweightRival.wheels.length !== 4 ||
    lightweightRival.boostFlame.children.length !== 2 ||
    lightweightRivalMeshCount > 25 ||
    lightweightRivalTriangles > 700 ||
    lightweightRivalPlaneWheelsVisible ||
    !lightweightRivalKartWheelsVisible ||
    vehicleWorld.children.length !== 3
  ) {
    fail('Extracted race vehicle mesh helper should preserve player/rival vehicle creation, shield mesh, switch ring, mode setup, and world parenting', {
      lightweightRival: {
        boostFlames: lightweightRival.boostFlame.children.length,
        kartWheelsVisible: lightweightRivalKartWheelsVisible,
        meshes: lightweightRivalMeshCount,
        planeWheelsVisible: lightweightRivalPlaneWheelsVisible,
        triangles: lightweightRivalTriangles,
        wheels: lightweightRival.wheels.length,
      },
      playerHoverGroup,
      playerRearNumberPlate,
      playerRearNumberStrokes,
      playerWheelParentVisible,
      rivalWheelParentVisible,
      switchRingMesh,
      vehicleMeshes,
      vehicleWorldChildren: vehicleWorld.children.length,
    });
  }

  const syncPlayerVehicle = createVehicleModel({
    accent: '#00ffff',
    color: '#ff0000',
    scale: 1,
    suit: '#111111',
  });
  const syncRivalModel = createVehicleModel({
    accent: '#00ff00',
    color: '#ffff00',
    scale: 1,
    suit: '#222222',
  });
  const syncSwitchRing = createVehicleSwitchRing();
  const syncCityHookCalls = [];
  const syncWorld = new THREE.Group();
  syncWorld.userData.cityAnimationHooks = [
    {
      userData: {
        animate: (now, dt) => syncCityHookCalls.push({ dt, now }),
      },
    },
  ];
  const syncBananaMesh = new THREE.Object3D();
  const syncBalloonMesh = new THREE.Object3D();
  const syncZipperMesh = new THREE.Object3D();
  syncZipperMesh.userData.kind = 'boost-pad-visual';
  const syncZipperChevron = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  syncZipperChevron.userData.kind = 'boost-pad-chevron';
  const syncZipperStripe = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  syncZipperStripe.userData.kind = 'boost-pad-center-stripe';
  syncZipperMesh.add(syncZipperChevron, syncZipperStripe);
  const syncFlightGateMesh = {
    glow: { material: { opacity: 0 } },
    group: new THREE.Group(),
    ring: { material: { opacity: 0 } },
  };
  const syncSwitchPadMesh = new THREE.Object3D();
  const syncHazardMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ opacity: 0.1, transparent: true })
  );
  const syncTrapMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ opacity: 0.1, transparent: true })
  );
  const syncDroppedBananaMesh = new THREE.Object3D();
  syncRaceMeshes({
    balloonMeshes: [syncBalloonMesh],
    bananaMeshes: [syncBananaMesh],
    compiled: {
      pointAt: () => ({
        point: new THREE.Vector3(0, 0, 0),
        tangent: new THREE.Vector3(1, 0, 0),
      }),
    },
    defaultVehicle: 'kart',
    droppedBananaMeshes: [
      {
        banana: { life: 2, position: new THREE.Vector3(9, 0, 10) },
        mesh: syncDroppedBananaMesh,
      },
    ],
    dt: 0.1,
    flightGateMeshes: [syncFlightGateMesh],
    now: 140,
    playerVehicle: syncPlayerVehicle,
    race: {
      balloons: [{ cooldown: 0 }],
      bananas: [{ cooldown: 0 }],
      flightGates: [{ altitude: 12, cooldown: 0 }],
      player: {
        boostTimer: 0.2,
        driftActive: true,
        driftCharge: 1.2,
        driftDirection: 1,
        heading: 0.4,
        jumpHeight: 0,
        position: new THREE.Vector3(1, 0, 2),
        shieldTimer: 1.1,
        speed: 30,
        steerInput: 0.5,
        transformTimer: 0.4,
        vehicleMode: 'kart',
        velocity: new THREE.Vector3(30, 0, 0),
      },
      rivals: [
        {
          position: new THREE.Vector3(3, 0, 4),
          progress: 0.2,
          speed: 10,
          vehicleMode: 'plane',
          wobble: 1,
        },
      ],
      switchPads: [{ cooldown: 0 }],
      time: 0.25,
      trackHazards: [{ active: true }],
      zippers: [{ cooldown: 0 }],
    },
    rivalModels: [syncRivalModel],
    switchPadMeshes: [syncSwitchPadMesh],
    switchRing: syncSwitchRing,
    trackHazardMeshes: [syncHazardMesh],
    trapMeshes: [{ hazard: { life: 3 }, mesh: syncTrapMesh }],
    world: syncWorld,
    zipperMeshes: [syncZipperMesh],
  });
  if (
    syncPlayerVehicle.group.position.x !== 1 ||
    syncPlayerVehicle.group.position.z !== 2 ||
    !syncPlayerVehicle.boostFlame.visible ||
    syncPlayerVehicle.boostFlame.children.filter((child) => child.userData?.kind === 'boost-burst-streak' && child.visible).length !== 2 ||
    Math.abs(syncPlayerVehicle.wheels.find((wheel) => wheel.userData.front).rotation.y - 0.18) > 0.001 ||
    !syncPlayerVehicle.driftSparkGroup.visible ||
    syncPlayerVehicle.driftSparkGroup.children.filter((child) => child.userData.kind === 'drift-trail-visual' && child.visible).length !== 2 ||
    !syncPlayerVehicle.shieldGroup.visible ||
    !syncPlayerVehicle.shieldGroup.children.find((child) => child.userData?.kind === 'shield-burst-crown')?.visible ||
    !syncSwitchRing.visible ||
    Math.abs(syncSwitchRing.material.opacity - 0.8) > 0.001 ||
    Math.abs(syncSwitchRing.scale.x - 1.08) > 0.001 ||
    syncRivalModel.group.position.x !== 3 ||
    syncRivalModel.group.position.z !== 4 ||
    Math.abs(syncRivalModel.group.position.y - 17.42) > 0.001 ||
    syncRivalModel.wheels[0].parent.visible ||
    !syncBananaMesh.visible ||
    syncBananaMesh.position.y <= 1.2 ||
    !syncBalloonMesh.visible ||
    syncBalloonMesh.position.y <= 3.4 ||
    !syncZipperMesh.visible ||
    !syncZipperMesh.userData.visualActive ||
    !syncZipperChevron.visible ||
    syncZipperChevron.material.opacity <= 0.8 ||
    !syncZipperChevron.material.transparent ||
    !syncZipperStripe.visible ||
    syncZipperStripe.material.opacity !== 0.72 ||
    !syncZipperStripe.material.transparent ||
    !syncFlightGateMesh.group.visible ||
    syncFlightGateMesh.group.position.y <= 11.5 ||
    Math.abs(syncFlightGateMesh.ring.material.opacity - 0.32) > 0.001 ||
    Math.abs(syncFlightGateMesh.glow.material.opacity - 0.06) > 0.001 ||
    syncSwitchPadMesh.rotation.y <= 0 ||
    !syncHazardMesh.visible ||
    syncHazardMesh.material.opacity <= 0.8 ||
    syncCityHookCalls.length !== 1 ||
    !syncTrapMesh.visible ||
    Math.abs(syncTrapMesh.material.opacity - 0.5) > 0.001 ||
    !syncDroppedBananaMesh.visible ||
    syncDroppedBananaMesh.position.x !== 9 ||
    syncDroppedBananaMesh.position.y <= 1
  ) {
    fail('Extracted race mesh sync helper should preserve per-frame player, rival, pickup, hazard, city, trap, and dropped banana mutations', {
      balloon: syncBalloonMesh.position,
      cityHookCalls: syncCityHookCalls,
      droppedBanana: syncDroppedBananaMesh.position,
      flightGate: {
        glow: syncFlightGateMesh.glow.material.opacity,
        ring: syncFlightGateMesh.ring.material.opacity,
        y: syncFlightGateMesh.group.position.y,
      },
      hazard: {
        opacity: syncHazardMesh.material.opacity,
        visible: syncHazardMesh.visible,
      },
      playerPosition: syncPlayerVehicle.group.position,
      rivalPosition: syncRivalModel.group.position,
      switchRing: {
        opacity: syncSwitchRing.material.opacity,
        scale: syncSwitchRing.scale.x,
        visible: syncSwitchRing.visible,
      },
    });
  }

  const billboardDrawCalls = [];
  const billboardCanvas = {
    getContext: () => ({
      fillRect: (...args) => billboardDrawCalls.push({ args, type: 'fillRect' }),
      fillText: (...args) => billboardDrawCalls.push({ args, type: 'fillText' }),
      strokeRect: (...args) => billboardDrawCalls.push({ args, type: 'strokeRect' }),
      set fillStyle(value) {
        billboardDrawCalls.push({ type: 'fillStyle', value });
      },
      set font(value) {
        billboardDrawCalls.push({ type: 'font', value });
      },
      set lineWidth(value) {
        billboardDrawCalls.push({ type: 'lineWidth', value });
      },
      set strokeStyle(value) {
        billboardDrawCalls.push({ type: 'strokeStyle', value });
      },
      set textAlign(value) {
        billboardDrawCalls.push({ type: 'textAlign', value });
      },
      set textBaseline(value) {
        billboardDrawCalls.push({ type: 'textBaseline', value });
      },
    }),
  };
  const billboardDocumentRef = {
    createElement: (tagName) => {
      if (tagName !== 'canvas') fail('Billboard helper should only create a canvas', { tagName });
      return billboardCanvas;
    },
  };
  const billboardSprite = createBillboardText('Food Court', '#ffac32', { documentRef: billboardDocumentRef });
  const cachedBillboardSprite = createBillboardText('Food Court', '#ffac32', { documentRef: billboardDocumentRef });
  const billboardFillText = billboardDrawCalls.find((entry) => entry.type === 'fillText');
  const billboardStrokeRect = billboardDrawCalls.find((entry) => entry.type === 'strokeRect');
  const billboardAccentBars = billboardDrawCalls.filter(
    (entry) =>
      entry.type === 'fillRect' &&
      entry.args[2] === BILLBOARD_TEXT_STYLE.canvasWidth &&
      entry.args[3] === BILLBOARD_TEXT_STYLE.accentBarHeight
  );
  const billboardInnerPanel = billboardDrawCalls.find(
    (entry) =>
      entry.type === 'fillRect' &&
      entry.args[2] === BILLBOARD_TEXT_STYLE.canvasWidth - 28 &&
      entry.args[3] === BILLBOARD_TEXT_STYLE.canvasHeight - 36
  );
  if (
    billboardCanvas.width !== BILLBOARD_TEXT_STYLE.canvasWidth ||
    billboardCanvas.height !== BILLBOARD_TEXT_STYLE.canvasHeight ||
    billboardSprite.scale.x !== BILLBOARD_TEXT_STYLE.scale.x ||
    billboardSprite.scale.y !== BILLBOARD_TEXT_STYLE.scale.y ||
    billboardSprite.scale.z !== BILLBOARD_TEXT_STYLE.scale.z ||
    billboardSprite.material.opacity !== BILLBOARD_TEXT_STYLE.opacity ||
    billboardSprite.material.depthTest ||
    billboardSprite.material.depthWrite ||
    !billboardSprite.material.transparent ||
    billboardSprite.material.map.image !== billboardCanvas ||
    billboardSprite.material.map.colorSpace !== THREE.SRGBColorSpace ||
    billboardSprite.material.map.generateMipmaps ||
    billboardSprite.material.map.magFilter !== THREE.LinearFilter ||
    billboardSprite.material.map.minFilter !== THREE.LinearFilter ||
    cachedBillboardSprite.material.map !== billboardSprite.material.map ||
    cachedBillboardSprite.material !== billboardSprite.material ||
    !billboardDrawCalls.some((entry) => entry.type === 'fillStyle' && entry.value === BILLBOARD_TEXT_STYLE.background) ||
    !billboardDrawCalls.some((entry) => entry.type === 'fillStyle' && entry.value === BILLBOARD_TEXT_STYLE.innerBackground) ||
    !billboardDrawCalls.some((entry) => entry.type === 'strokeStyle' && entry.value === '#ffac32') ||
    !billboardDrawCalls.some((entry) => entry.type === 'font' && entry.value === BILLBOARD_TEXT_STYLE.font) ||
    billboardAccentBars.length !== 2 ||
    !billboardInnerPanel ||
    !billboardFillText ||
    billboardFillText.args[0] !== 'FOOD COURT' ||
    billboardFillText.args[1] !== BILLBOARD_TEXT_STYLE.canvasWidth / 2 ||
    billboardFillText.args[2] !== BILLBOARD_TEXT_STYLE.canvasHeight / 2 + BILLBOARD_TEXT_STYLE.textBaselineOffset ||
    !billboardStrokeRect ||
    billboardStrokeRect.args[0] !== BILLBOARD_TEXT_STYLE.strokeInset ||
    billboardStrokeRect.args[2] !== BILLBOARD_TEXT_STYLE.canvasWidth - BILLBOARD_TEXT_STYLE.strokeInset * 2
  ) {
    fail('Extracted billboard text helper should preserve canvas drawing, texture, material, uppercase text, and sprite scale', {
      billboardDrawCalls,
      billboardSprite: {
        depthWrite: billboardSprite.material.depthWrite,
        opacity: billboardSprite.material.opacity,
        scale: billboardSprite.scale,
        transparent: billboardSprite.material.transparent,
      },
    });
  }

  const sceneThemeDistricts = createDefaultRaceCityDistricts({
    clinic: '#clinic',
    food: '#food',
    garage: '#garage',
    gym: '#gym',
    lab: '#lab',
  });
  if (
    TRACK_THEME['comeback-city']?.sky !== '#58c8f1' ||
    TRACK_THEME['comeback-city']?.fog !== '#d5f9ff' ||
    TRACK_THEME['tide-pier']?.ground !== '#5fa56c' ||
    TRACK_THEME['magnet-mine-descent']?.sky !== '#140f1c' ||
    TRACK_THEME['static-storm-plateau']?.horizon !== '#1f2a55' ||
    sceneThemeDistricts.length !== 5 ||
    sceneThemeDistricts[0].label !== 'GYM' ||
    sceneThemeDistricts[0].accent !== '#gym' ||
    sceneThemeDistricts[0].progress !== 0.905 ||
    sceneThemeDistricts[0].side !== 1 ||
    sceneThemeDistricts[1].label !== 'FOOD COURT' ||
    sceneThemeDistricts[1].accent !== '#food' ||
    sceneThemeDistricts[1].side !== -1 ||
    sceneThemeDistricts[2].label !== 'LAB' ||
    sceneThemeDistricts[2].accent !== '#lab' ||
    sceneThemeDistricts[3].label !== 'CLINIC' ||
    sceneThemeDistricts[3].accent !== '#clinic' ||
    sceneThemeDistricts[4].label !== 'GARAGE' ||
    sceneThemeDistricts[4].accent !== '#garage' ||
    sceneThemeDistricts[4].roof !== '#e4f8ff'
  ) {
    fail('Extracted race scene theme helper should preserve track theme and default Comeback City district values', {
      sceneThemeDistricts,
      trackTheme: TRACK_THEME,
    });
  }

  const raceSceneShell = createRaceSceneShell({ theme: { fog: '#040506', sky: '#010203' } });
  const [skyLight, sunLight, rimLight, worldGroup] = raceSceneShell.scene.children;
  if (
    raceSceneShell.scene.background.getHexString() !== '010203' ||
    raceSceneShell.scene.fog.color.getHexString() !== '040506' ||
    raceSceneShell.scene.fog.near !== RACE_FOG_NEAR ||
    raceSceneShell.scene.fog.far !== RACE_FOG_FAR ||
    raceSceneShell.camera.type !== 'PerspectiveCamera' ||
    raceSceneShell.camera.fov !== 76 ||
    raceSceneShell.camera.aspect !== 1 ||
    raceSceneShell.camera.near !== 0.25 ||
    raceSceneShell.camera.far !== RACE_CAMERA_FAR ||
    skyLight !== raceSceneShell.skyLight ||
    skyLight.type !== 'HemisphereLight' ||
    skyLight.color.getHexString() !== 'fff8cf' ||
    skyLight.groundColor.getHexString() !== '2085a4' ||
    skyLight.intensity !== 3.15 ||
    sunLight !== raceSceneShell.sun ||
    sunLight.type !== 'DirectionalLight' ||
    sunLight.color.getHexString() !== 'fff2b9' ||
    sunLight.intensity !== 3.55 ||
    sunLight.position.x !== -64 ||
    sunLight.position.y !== 98 ||
    sunLight.position.z !== -54 ||
    sunLight.castShadow ||
    rimLight !== raceSceneShell.rim ||
    rimLight.type !== 'DirectionalLight' ||
    rimLight.color.getHexString() !== '63e6ff' ||
    rimLight.intensity !== 1.45 ||
    rimLight.position.x !== 84 ||
    rimLight.position.y !== 52 ||
    rimLight.position.z !== 76 ||
    worldGroup !== raceSceneShell.world ||
    worldGroup.type !== 'Group'
  ) {
    fail('Extracted race scene shell should preserve camera, fog, performance-oriented lighting, and world group defaults', {
      camera: raceSceneShell.camera,
      children: raceSceneShell.scene.children.map((child) => child.type),
      rimLight,
      skyLight,
      sunLight,
      worldGroup,
    });
  }

  const rendererCanvas = { id: 'unit-canvas' };
  const rendererOptionsSeen = [];
  class FakeRaceRenderer {
    constructor(options) {
      rendererOptionsSeen.push(options);
      this.shadowMap = {};
    }
  }
  const raceRenderer = createRaceRenderer({
    canvas: rendererCanvas,
    RendererClass: FakeRaceRenderer,
  });
  const rendererFailure = new Error('renderer unavailable');
  const rendererWarns = [];
  let unavailableError = null;
  class FailingRaceRenderer {
    constructor() {
      throw rendererFailure;
    }
  }
  const unavailableRenderer = createRaceRenderer({
    canvas: rendererCanvas,
    consoleRef: { warn: (...args) => rendererWarns.push(args) },
    onUnavailable: (error) => {
      unavailableError = error;
    },
    RendererClass: FailingRaceRenderer,
  });
  if (
    rendererOptionsSeen.length !== 1 ||
    rendererOptionsSeen[0].canvas !== rendererCanvas ||
    rendererOptionsSeen[0].antialias !== RACE_RENDERER_OPTIONS.antialias ||
    rendererOptionsSeen[0].depth !== RACE_RENDERER_OPTIONS.depth ||
    rendererOptionsSeen[0].powerPreference !== RACE_RENDERER_OPTIONS.powerPreference ||
    rendererOptionsSeen[0].preserveDrawingBuffer !== RACE_RENDERER_OPTIONS.preserveDrawingBuffer ||
    raceRenderer.outputColorSpace !== THREE.SRGBColorSpace ||
    raceRenderer.toneMapping !== THREE.ACESFilmicToneMapping ||
    raceRenderer.toneMappingExposure !== 1.2 ||
    raceRenderer.shadowMap.enabled !== false ||
    unavailableRenderer !== null ||
    unavailableError !== rendererFailure ||
    rendererWarns.length !== 1 ||
    rendererWarns[0][0] !== 'Comeback City race WebGL renderer unavailable, using 2D fallback:' ||
    rendererWarns[0][1] !== rendererFailure
  ) {
    fail('Extracted race renderer helper should preserve WebGL options, renderer configuration, and fallback callback behavior', {
      raceRenderer,
      rendererOptionsSeen,
      rendererWarns,
      unavailableError,
      unavailableRenderer,
    });
  }

  const fitSetSizes = [];
  const fitPixelRatios = [];
  const fitCanvas = {
    getBoundingClientRect: () => ({ height: 500, width: 320 }),
    height: 0,
    width: 0,
  };
  const fitCamera = {
    aspect: 0,
    projectionUpdates: 0,
    updateProjectionMatrix() {
      this.projectionUpdates += 1;
    },
  };
  const fitViewport = { height: 1, mobile: false, width: 1 };
  const fitRect = fitRaceRendererToCanvas({
    camera: fitCamera,
    canvas: fitCanvas,
    raceViewport: fitViewport,
    renderer: {
      setPixelRatio: (ratio) => fitPixelRatios.push(ratio),
      setSize: (...args) => fitSetSizes.push(args),
    },
    windowRef: { devicePixelRatio: 3 },
  });
  const stableFitSetSizes = [];
  const stableFitCanvas = {
    getBoundingClientRect: () => ({ height: 450, width: 900 }),
    height: Math.floor(450 * 2 * RACE_RENDER_SCALE.desktop),
    width: Math.floor(900 * 2 * RACE_RENDER_SCALE.desktop),
  };
  const stableFitCamera = {
    aspect: 0,
    projectionUpdates: 0,
    updateProjectionMatrix() {
      this.projectionUpdates += 1;
    },
  };
  const stableFitViewport = { height: 1, mobile: true, width: 1 };
  fitRaceRendererToCanvas({
    camera: stableFitCamera,
    canvas: stableFitCanvas,
    raceViewport: stableFitViewport,
    renderer: {
      setPixelRatio: (ratio) => fitPixelRatios.push(ratio),
      setSize: (...args) => stableFitSetSizes.push(args),
    },
    windowRef: { devicePixelRatio: 2 },
  });
  fitRaceRendererToCanvas({
    camera: stableFitCamera,
    canvas: stableFitCanvas,
    raceViewport: stableFitViewport,
    renderer: {
      setPixelRatio: (ratio) => fitPixelRatios.push(ratio),
      setSize: (...args) => stableFitSetSizes.push(args),
    },
    windowRef: { devicePixelRatio: 2 },
  });
  if (
    fitRect.width !== 320 ||
    fitRect.height !== 500 ||
    fitViewport.width !== 320 ||
    fitViewport.height !== 500 ||
    !fitViewport.mobile ||
    fitPixelRatios[0] !== 2 * RACE_RENDER_SCALE.mobile ||
    fitSetSizes.length !== 1 ||
    fitSetSizes[0][0] !== 320 ||
    fitSetSizes[0][1] !== 500 ||
    fitSetSizes[0][2] !== false ||
    Math.abs(fitCamera.aspect - 0.64) > 0.001 ||
    fitCamera.projectionUpdates !== 1 ||
    fitPixelRatios[1] !== 2 * RACE_RENDER_SCALE.desktop ||
    fitPixelRatios.length !== 2 ||
    stableFitSetSizes.length !== 0 ||
    stableFitViewport.width !== 900 ||
    stableFitViewport.height !== 450 ||
    stableFitViewport.mobile ||
    stableFitViewport.rawDpr !== 2 ||
    stableFitViewport.renderScale !== RACE_RENDER_SCALE.desktop ||
    stableFitCamera.aspect !== 2 ||
    stableFitCamera.projectionUpdates !== 1
  ) {
    fail('Extracted race renderer fit helper should preserve DPR cap/render scale, mobile viewport flag, resize gating, and camera aspect updates', {
      fitCamera,
      fitPixelRatios,
      fitRect,
      fitSetSizes,
      fitViewport,
      stableFitCamera,
      stableFitSetSizes,
      stableFitViewport,
    });
  }

  const legacyWorldPoint = toWorldPoint({ x: 512, y: 384 }, 3);
  const coursePoint = toCourseV2Point({ x: 6, z: 8 }, 2);
  const courseFallbackPoint = toCourseV2Point({ x: 6, y: 9 }, 2);
  const shortSampleLine = sampleCourseLine([{ x: 0, z: 0 }, { x: 8, z: 0 }], { divisions: 12 });
  const compiledLegacyTrack = compileTrack3D({
    aiRivals: [
      { accent: '#facc15', color: '#ef4444', name: 'Rival A' },
      { accent: '#38bdf8', color: '#2563eb', name: 'Rival B' },
    ],
    bananaCount: 3,
    boostPads: [{ layer: 'air', progress: 0.5, side: 0.1 }],
    hazards: [{ progress: 1.12, radius: 5, type: 'wet' }],
    itemBoxes: [0.25],
    key: 'unit-loop',
    points: [
      { x: 512, y: 384 },
      { x: 612, y: 384 },
      { x: 612, y: 484 },
      { x: 512, y: 484 },
    ],
    shortcuts: [
      {
        endProgress: 0.2,
        key: 'inside',
        points: [
          { x: 562, y: 384 },
          { x: 612, y: 434 },
        ],
        startProgress: 0.1,
        width: 80,
      },
    ],
    switchPads: [{ progress: -0.2, targetVehicle: 'plane' }],
    vehicleLocks: [{ end: 1.15, start: -0.1 }],
    vehicleZones: [{ progress: 0.4, vehicle: 'hover' }],
    width: 100,
  });
  const compiledLegacyPoint = compiledLegacyTrack.pointAt(0.25);
  const compiledLegacyNearest = compiledLegacyTrack.nearest(new THREE.Vector3(16, 0, 8));
  const compiledCourseTrack = compileTrack3D({
    courseV2: {
      bananaPlacements: [0.2],
      branches: [
        {
          endProgress: 0.45,
          key: 'lab-line',
          points: [
            { x: 4, z: 2 },
            { x: 70, z: 60 },
          ],
          shoulderWidth: 4,
          startProgress: 0.05,
          width: 22,
        },
      ],
      cameraCheckpoints: [{ key: 'camera-a', progress: 0.12 }],
      centerline: [
        { x: 0, z: 0 },
        { x: 80, z: 0 },
        { x: 80, z: 80 },
        { x: 0, z: 80 },
      ],
      collisionZones: [{ position: { x: 1, z: 2 }, radius: 3 }],
      districtAnchors: [{ label: 'GYM', progress: 0.2 }],
      mainRoadWidth: 55,
      sampleCount: 16,
      surfaceZones: [{ end: 0.25, start: 0.2, type: 'offroad' }],
    },
    key: 'course-loop',
    layers: {
      ground: {
        hazards: [{ progress: 0.4, type: 'wet' }],
        itemBoxes: [{ progress: 0.2, rare: true }],
        name: 'ground lane',
      },
    },
    width: 44,
  });
  if (
    legacyWorldPoint.x !== 0 ||
    legacyWorldPoint.y !== 3 ||
    legacyWorldPoint.z !== 0 ||
    coursePoint.x !== 6 ||
    coursePoint.y !== 2 ||
    coursePoint.z !== 8 ||
    courseFallbackPoint.y !== 9 ||
    courseFallbackPoint.z !== 9 ||
    shortSampleLine.length !== 2 ||
    layerAltitude('air') !== FLIGHT_ALTITUDE_LIMITS.cruise ||
    layerAltitude('hybrid') !== 7.5 ||
    layerAltitude('ground') !== 0 ||
    layerOffset('air', 100) !== 42 ||
    layerOffset('hybrid', 100) !== -34 ||
    layerOffset('ground', 100) !== 0 ||
    Math.abs(compiledLegacyTrack.roadWidth - 47.36) > 0.001 ||
    Math.abs(compiledLegacyTrack.totalLength - 128) > 0.001 ||
    compiledLegacyTrack.points.length !== 4 ||
    compiledLegacyTrack.segments.length !== 4 ||
    compiledLegacyTrack.routeLayers.ground.vehiclePreference !== 'kart' ||
    compiledLegacyTrack.routeLayers.air.vehiclePreference !== 'plane' ||
    compiledLegacyTrack.itemBoxPlacements[0]?.layer !== 'ground' ||
    compiledLegacyTrack.itemBoxPlacements[0]?.progress !== 0.25 ||
    Math.abs(compiledLegacyTrack.hazardPlacements[0]?.progress - 0.12) > 0.001 ||
    compiledLegacyTrack.hazardPlacements[0]?.definition?.effect !== 'slow' ||
    compiledLegacyTrack.switchPads[0]?.progress !== 0.8 ||
    compiledLegacyTrack.switchPads[0]?.targetVehicle !== 'plane' ||
    compiledLegacyTrack.vehicleZones[0]?.radius !== 12 ||
    Math.abs(compiledLegacyTrack.vehicleLocks[0]?.start - 0.9) > 0.001 ||
    Math.abs(compiledLegacyTrack.vehicleLocks[0]?.end - 0.15) > 0.001 ||
    compiledLegacyTrack.branchRoutes[0]?.key !== 'inside' ||
    Math.abs(compiledLegacyTrack.branchRoutes[0]?.roadWidth - 37.888) > 0.001 ||
    Math.abs(compiledLegacyTrack.branchRoutes[0]?.shoulderWidth - SHOULDER_WIDTH * 0.72) > 0.001 ||
    Math.abs(compiledLegacyPoint.point.x - 32) > 0.001 ||
    Math.abs(compiledLegacyPoint.point.z) > 0.001 ||
    !Number.isFinite(compiledLegacyNearest.distance) ||
    Math.abs(compiledCourseTrack.roadWidth - 55) > 0.001 ||
    compiledCourseTrack.points.length !== 16 ||
    compiledCourseTrack.branchRoutes[0]?.roadWidth !== 22 ||
    compiledCourseTrack.branchRoutes[0]?.shoulderWidth !== 4 ||
    compiledCourseTrack.cameraCheckpoints[0]?.key !== 'camera-a' ||
    compiledCourseTrack.collisionZones[0]?.radius !== 3 ||
    compiledCourseTrack.districtAnchors[0]?.label !== 'GYM' ||
    compiledCourseTrack.surfaceZones[0]?.type !== 'offroad' ||
    compiledCourseTrack.bananaPlacements[0] !== 0.2 ||
    compiledCourseTrack.routeLayers.ground.name !== 'ground lane' ||
    compiledCourseTrack.itemBoxPlacements[0]?.rare !== true ||
    compiledCourseTrack.hazardPlacements[0]?.layer !== 'ground'
  ) {
    fail('Extracted track geometry compiler should preserve legacy and courseV2 track compilation behavior', {
      compiledCourseTrack: {
        branch: compiledCourseTrack.branchRoutes[0],
        itemBox: compiledCourseTrack.itemBoxPlacements[0],
        points: compiledCourseTrack.points.length,
        roadWidth: compiledCourseTrack.roadWidth,
      },
      compiledLegacyTrack: {
        branch: compiledLegacyTrack.branchRoutes[0],
        hazard: compiledLegacyTrack.hazardPlacements[0],
        itemBox: compiledLegacyTrack.itemBoxPlacements[0],
        pointAtQuarter: compiledLegacyPoint,
        roadWidth: compiledLegacyTrack.roadWidth,
        totalLength: compiledLegacyTrack.totalLength,
      },
    });
  }

  const trackRenderMaterials = createTrackRenderMaterials({
    compiled: {
      accent: '#112233',
      asphalt: '#223344',
      curbA: '#334455',
      curbB: '#445566',
      grass: '#556677',
    },
    theme: { ground: '#667788' },
  });
  const trackMeshWorld = new THREE.Group();
  const trackMeshCompiled = {
    ...compiledCourseTrack,
    accent: '#34d399',
    asphalt: '#20242c',
    curbA: '#f7fbff',
    curbB: '#34d399',
    grass: '#497a57',
    key: 'comeback-city',
    startProgress: 0,
  };
  const trackMeshLabelDrawCalls = [];
  const trackMeshDocumentRef = {
    createElement: (tagName) => {
      if (tagName !== 'canvas') fail('Track mesh helper should only create canvas labels', { tagName });
      return {
        getContext: () => ({
          fillRect: (...args) => trackMeshLabelDrawCalls.push({ args, type: 'fillRect' }),
          fillText: (...args) => trackMeshLabelDrawCalls.push({ args, type: 'fillText' }),
          strokeRect: (...args) => trackMeshLabelDrawCalls.push({ args, type: 'strokeRect' }),
          set fillStyle(value) {
            trackMeshLabelDrawCalls.push({ type: 'fillStyle', value });
          },
          set font(value) {
            trackMeshLabelDrawCalls.push({ type: 'font', value });
          },
          set lineWidth(value) {
            trackMeshLabelDrawCalls.push({ type: 'lineWidth', value });
          },
          set strokeStyle(value) {
            trackMeshLabelDrawCalls.push({ type: 'strokeStyle', value });
          },
          set textAlign(value) {
            trackMeshLabelDrawCalls.push({ type: 'textAlign', value });
          },
          set textBaseline(value) {
            trackMeshLabelDrawCalls.push({ type: 'textBaseline', value });
          },
        }),
      };
    },
  };
  const trackMesh = createTrackMesh({
    compiled: trackMeshCompiled,
    documentRef: trackMeshDocumentRef,
    theme: { ground: '#355c42' },
    world: trackMeshWorld,
  });
  const startFinishGate = trackMesh.startTiles[0]?.parent;
  const startFinishBanner = startFinishGate?.children.find(
    (child) => child.userData?.kind === 'start-finish-gate-banner'
  );
  const startFinishSideFlags =
    startFinishGate?.children.filter((child) => child.userData?.kind === 'start-finish-gate-side-flag') || [];
  const finishCelebrationRoadDecals = [];
  const finishCelebrationRoadDecalPlanes = [];
  const cornerCoachingSigns = [];
  trackMeshWorld.traverse((object) => {
    if (object.userData?.kind === 'finish-celebration-road-decal') finishCelebrationRoadDecals.push(object);
    if (object.userData?.kind === 'finish-celebration-road-decal-plane') finishCelebrationRoadDecalPlanes.push(object);
    if (object.userData?.kind === 'corner-coaching-sign') cornerCoachingSigns.push(object);
  });
  const cornerCoachingLabels = cornerCoachingSigns
    .map((group) => group.children.find((child) => child.userData?.kind === 'corner-coaching-sign-label'))
    .filter(Boolean);
  const cornerCoachingMarkers = cornerCoachingSigns
    .map((group) => group.children.find((child) => child.userData?.kind === 'corner-coaching-sign-marker'))
    .filter(Boolean);
  const openingLaunchPaintGroups = [];
  const openingLaunchPaintStripes = [];
  const openingLaunchPaintChevrons = [];
  const openingLaunchDecals = [];
  const openingLaunchDecalPlanes = [];
  const openingSweeperDriftPaintStripes = [];
  const openingSweeperDriftPaintChevrons = [];
  trackMeshWorld.traverse((object) => {
    if (object.userData?.kind === 'opening-launch-paint') openingLaunchPaintGroups.push(object);
    if (object.userData?.kind === 'opening-launch-paint-stripe') openingLaunchPaintStripes.push(object);
    if (object.userData?.kind === 'opening-launch-paint-chevron') openingLaunchPaintChevrons.push(object);
    if (object.userData?.kind === 'opening-launch-road-decal') openingLaunchDecals.push(object);
    if (object.userData?.kind === 'opening-launch-road-decal-plane') openingLaunchDecalPlanes.push(object);
    if (object.userData?.kind === 'opening-sweeper-drift-paint-stripe') openingSweeperDriftPaintStripes.push(object);
    if (object.userData?.kind === 'opening-sweeper-drift-paint-chevron') openingSweeperDriftPaintChevrons.push(object);
  });
  const openingLaunchPaintBatches = [...openingLaunchPaintStripes, ...openingLaunchPaintChevrons];
  const openingLaunchPaintInstanceCount = openingLaunchPaintBatches.reduce(
    (total, mesh) => total + (mesh.count || 0),
    0
  );
  const openingSweeperDriftPaintBatches = [
    ...openingSweeperDriftPaintStripes,
    ...openingSweeperDriftPaintChevrons,
  ];
  const openingSweeperDriftPaintInstanceCount = openingSweeperDriftPaintBatches.reduce(
    (total, mesh) => total + (mesh.count || 0),
    0
  );
  const openingLaunchDecalLabels = openingLaunchDecals.map((decal) => decal.userData.label);
  const roadPaintAccentBars = trackMeshLabelDrawCalls.filter(
    (entry) => entry.type === 'fillRect' && entry.args[2] >= 360 && entry.args[3] === 9
  );
  const visualTrackSegments = createCleanCourseVisualSegments(trackMeshCompiled.segments);
  const visualSegmentSourceTotal = visualTrackSegments.reduce((total, segment) => total + segment.sourceCount, 0);
  const syntheticVisualSegments = createCleanCourseVisualSegments([
    {
      a: new THREE.Vector3(0, 0, 0),
      b: new THREE.Vector3(10, 0, 0),
      dx: 10,
      dz: 0,
      length: 10,
      tangent: new THREE.Vector3(1, 0, 0),
    },
    {
      a: new THREE.Vector3(10, 0, 0),
      b: new THREE.Vector3(20, 0, 0.4),
      dx: 10,
      dz: 0.4,
      length: Math.hypot(10, 0.4),
      tangent: new THREE.Vector3(1, 0, 0).normalize(),
    },
    {
      a: new THREE.Vector3(20, 0, 0.4),
      b: new THREE.Vector3(30, 0, 12),
      dx: 10,
      dz: 11.6,
      length: Math.hypot(10, 11.6),
      tangent: new THREE.Vector3(10, 0, 11.6).normalize(),
    },
  ]);
  const cappedVisualSegments = createCleanCourseVisualSegments([
    {
      a: new THREE.Vector3(0, 0, 0),
      b: new THREE.Vector3(10, 0, 0),
      dx: 10,
      dz: 0,
      length: 10,
      tangent: new THREE.Vector3(1, 0, 0),
    },
    {
      a: new THREE.Vector3(10, 0, 0),
      b: new THREE.Vector3(20, 0, 0),
      dx: 10,
      dz: 0,
      length: 10,
      tangent: new THREE.Vector3(1, 0, 0),
    },
    {
      a: new THREE.Vector3(20, 0, 0),
      b: new THREE.Vector3(30, 0, 0),
      dx: 10,
      dz: 0,
      length: 10,
      tangent: new THREE.Vector3(1, 0, 0),
    },
    {
      a: new THREE.Vector3(30, 0, 0),
      b: new THREE.Vector3(40, 0, 0),
      dx: 10,
      dz: 0,
      length: 10,
      tangent: new THREE.Vector3(1, 0, 0),
    },
  ]);
  const expectedCleanVisualSegmentCount =
    visualTrackSegments.length +
    (trackMeshCompiled.branchRoutes || []).reduce(
      (total, route) => total + createCleanCourseVisualSegments(route.segments).length,
      0
    );
  const sourceVisualSegmentCount =
    trackMeshCompiled.segments.length +
    (trackMeshCompiled.branchRoutes || []).reduce((total, route) => total + route.segments.length, 0);
  const nonCleanTrackMesh = createTrackMesh({
    compiled: {
      ...trackMeshCompiled,
      key: 'unit-non-clean-track',
    },
    theme: { ground: '#355c42' },
    world: new THREE.Group(),
  });
  const boostPadMesh = createBoostPadMesh({
    compiled: trackMeshCompiled,
    lineMat: trackMesh.materials.lineMat,
    world: trackMeshWorld,
    zipper: {
      position: new THREE.Vector3(4, 0, 6),
      tangent: new THREE.Vector3(0, 0, 1),
    },
  });
  const boostPadBase = boostPadMesh.children[0];
  const boostPadChevrons = boostPadMesh.children.filter((child) => child.userData?.kind === 'boost-pad-chevron');
  const boostPadCenterStripe = boostPadMesh.children.find((child) => child.userData?.kind === 'boost-pad-center-stripe');
  const boostPadGantryPosts = boostPadMesh.children.filter((child) => child.userData?.kind === 'boost-pad-gantry-post');
  const boostPadGantryBoard = boostPadMesh.children.find((child) => child.userData?.kind === 'boost-pad-gantry-board');
  const boostPadGantryTop = boostPadMesh.children.find((child) => child.userData?.kind === 'boost-pad-gantry-top');
  const boostPadGantryChevrons = boostPadMesh.children.filter((child) => child.userData?.kind === 'boost-pad-gantry-chevron');
  if (
    trackRenderMaterials.asphaltMat.color.getHexString() !== '223344' ||
    trackRenderMaterials.asphaltMat.roughness !== 0.76 ||
    trackRenderMaterials.groundMat.color.getHexString() !== '556677' ||
    trackRenderMaterials.groundMat.roughness !== 0.86 ||
    trackRenderMaterials.lineMat.color.getHexString() !== 'ffd34f' ||
    !trackMesh.cleanCityCourse ||
    trackMesh.dimensions.bounds !== compiledCourseTrack.bounds ||
    trackMesh.dimensions.trackSpanX !== compiledCourseTrack.bounds.maxX - compiledCourseTrack.bounds.minX ||
    trackMesh.dimensions.trackSpanZ !== compiledCourseTrack.bounds.maxZ - compiledCourseTrack.bounds.minZ ||
    trackMesh.ground !== trackMeshWorld.children[0] ||
    trackMesh.ground.geometry.parameters.width !== Math.max(500, trackMesh.dimensions.trackSpanX + 210) ||
    trackMesh.ground.geometry.parameters.height !== Math.max(460, trackMesh.dimensions.trackSpanZ + 220) ||
    trackMesh.ground.rotation.x !== -Math.PI / 2 ||
    trackMesh.ground.matrixAutoUpdate ||
    !trackMesh.ground.receiveShadow ||
    trackMesh.materials.asphaltMat.color.getHexString() !== '20242c' ||
    trackMesh.materials.railPostMat.color.getHexString() !== '202837' ||
    visualSegmentSourceTotal !== trackMeshCompiled.segments.length ||
    syntheticVisualSegments.length !== 2 ||
    syntheticVisualSegments[0].sourceCount !== 2 ||
    Math.abs(syntheticVisualSegments[0].length - Math.hypot(20, 0.4)) > 0.001 ||
    cappedVisualSegments.length !== 2 ||
    cappedVisualSegments[0].sourceCount !== 3 ||
    cappedVisualSegments[1].sourceCount !== 1 ||
    trackMesh.visualSegmentCount !== expectedCleanVisualSegmentCount ||
    trackMesh.instancedTrackMeshCount <= 0 ||
    trackMesh.openingApexCurbCount !== 16 ||
    trackMeshWorld.children.length >= sourceVisualSegmentCount * 5 ||
    nonCleanTrackMesh.visualSegmentCount !== sourceVisualSegmentCount ||
    nonCleanTrackMesh.instancedTrackMeshCount !== 0 ||
    startFinishGate?.userData?.kind !== 'start-finish-gate' ||
    !startFinishGate.children.some((child) => child.userData?.kind === 'start-finish-gate-beam') ||
    !startFinishBanner ||
    startFinishBanner.scale.x !== 25.5 ||
    startFinishBanner.scale.y !== 6.4 ||
    startFinishBanner.material.depthTest ||
    !trackMeshLabelDrawCalls.some((entry) => entry.type === 'fillText' && entry.args[0] === 'START / FINISH') ||
    startFinishSideFlags.length !== 4 ||
    startFinishSideFlags.some((flag) => flag.geometry.parameters.height !== 2.45 || flag.matrixAutoUpdate) ||
    trackMesh.finishCelebrationCueCount !== 1 ||
    finishCelebrationRoadDecals.length !== 1 ||
    finishCelebrationRoadDecalPlanes.length !== 1 ||
    finishCelebrationRoadDecalPlanes.some(
      (plane) =>
        plane.geometry.parameters.width !== 25.5 ||
        plane.geometry.parameters.height !== 8.8 ||
        plane.material.transparent ||
        plane.material.map.generateMipmaps ||
        plane.material.map.magFilter !== THREE.LinearFilter ||
        plane.material.map.minFilter !== THREE.LinearFilter ||
        plane.rotation.x !== -Math.PI / 2 ||
        plane.matrixAutoUpdate
    ) ||
    !trackMeshLabelDrawCalls.some((entry) => entry.type === 'fillText' && entry.args[0] === 'FINISH!') ||
    cornerCoachingSigns.length !== 2 ||
    cornerCoachingLabels.length !== 2 ||
    cornerCoachingLabels.some(
      (label) => label.scale.x !== 13.8 || label.scale.y !== 3.6 || label.material.depthTest
    ) ||
    cornerCoachingMarkers.length !== 2 ||
    cornerCoachingMarkers.some((marker) => marker.geometry.parameters.depth !== 7.4 || marker.matrixAutoUpdate) ||
    !trackMeshLabelDrawCalls.some((entry) => entry.type === 'fillText' && entry.args[0] === 'DRIFT BOOST') ||
    !trackMeshLabelDrawCalls.some((entry) => entry.type === 'fillText' && entry.args[0] === 'GO!') ||
    !trackMeshLabelDrawCalls.some((entry) => entry.type === 'fillText' && entry.args[0] === 'BOOST') ||
    trackMesh.openingLaunchDecalCount !== 2 ||
    openingLaunchDecals.length !== 2 ||
    !openingLaunchDecalLabels.includes('GO!') ||
    !openingLaunchDecalLabels.includes('BOOST') ||
    openingLaunchDecals.some((group) => group.matrixAutoUpdate) ||
    openingLaunchDecalPlanes.length !== 2 ||
    openingLaunchDecalPlanes.some(
      (plane) =>
        plane.geometry.parameters.width !== 22 ||
        plane.geometry.parameters.height !== 8 ||
        plane.material.transparent ||
        plane.material.map.generateMipmaps ||
        plane.material.map.magFilter !== THREE.LinearFilter ||
        plane.material.map.minFilter !== THREE.LinearFilter ||
        plane.rotation.x !== -Math.PI / 2 ||
        plane.matrixAutoUpdate
    ) ||
    roadPaintAccentBars.length < 4 ||
    trackMesh.openingLaunchPaintCount !== 24 ||
    openingLaunchPaintGroups.length !== 0 ||
    openingLaunchPaintStripes.length !== 6 ||
    openingLaunchPaintChevrons.length !== 3 ||
    openingLaunchPaintBatches.some(
      (mesh) =>
        !mesh.isInstancedMesh ||
        mesh.matrixAutoUpdate ||
        mesh.userData?.sourceKind !== 'opening-launch-paint' ||
        mesh.userData?.instanceCount !== mesh.count
    ) ||
    openingLaunchPaintInstanceCount !== 24 ||
    openingLaunchPaintStripes.some((stripe) => stripe.geometry.parameters.width !== 13.6) ||
    openingLaunchPaintChevrons.some(
      (chevron) => chevron.geometry.parameters.width !== 8.6 || chevron.geometry.parameters.depth !== 1.08
    ) ||
    trackMesh.openingSweeperDriftPaintCount !== 16 ||
    openingSweeperDriftPaintStripes.length !== 1 ||
    openingSweeperDriftPaintChevrons.length !== 1 ||
    openingSweeperDriftPaintBatches.some(
      (mesh) =>
        !mesh.isInstancedMesh ||
        mesh.matrixAutoUpdate ||
        mesh.userData?.sourceKind !== 'opening-sweeper-drift-paint' ||
        mesh.userData?.instanceCount !== mesh.count
    ) ||
    openingSweeperDriftPaintInstanceCount !== 16 ||
    openingSweeperDriftPaintStripes.some(
      (stripe) => stripe.geometry.parameters.width !== 15.8 || stripe.geometry.parameters.depth !== 0.86
    ) ||
    openingSweeperDriftPaintChevrons.some(
      (chevron) => chevron.geometry.parameters.width !== 10.4 || chevron.geometry.parameters.depth !== 1.22
    ) ||
    trackMesh.startTiles.length !== 24 ||
    !trackMesh.startTiles.every(
      (tile) =>
        tile.parent?.parent === trackMeshWorld &&
        tile.geometry.parameters.depth === trackMeshCompiled.roadWidth / 6 - 0.18 &&
        !tile.matrixAutoUpdate
    ) ||
    boostPadMesh.parent !== trackMeshWorld ||
    boostPadMesh.matrixAutoUpdate ||
    boostPadMesh.position.x !== 4 ||
    boostPadMesh.position.y !== 0.42 ||
    boostPadMesh.position.z !== 6 ||
    Math.abs(boostPadMesh.rotation.y + Math.PI / 2) > 0.001 ||
    boostPadMesh.userData.kind !== 'boost-pad-visual' ||
    boostPadMesh.children.length !== 14 ||
    boostPadBase.geometry.parameters.width !== 18.4 ||
    boostPadBase.geometry.parameters.depth !== trackMeshCompiled.roadWidth * 0.58 ||
    boostPadBase.matrixAutoUpdate ||
    boostPadChevrons.length !== 3 ||
    boostPadChevrons.some(
      (chevron, index) =>
        chevron.material === trackMesh.materials.lineMat ||
        chevron.matrixAutoUpdate ||
        Math.abs(chevron.position.x - [-5.6, 0, 5.6][index]) > 0.001 ||
        Math.abs(chevron.position.y - 0.68) > 0.001 ||
        chevron.geometry.parameters.radius !== 3.15 ||
        chevron.geometry.parameters.height !== 7.6
    ) ||
    !boostPadCenterStripe ||
    boostPadCenterStripe.geometry.parameters.width !== 16.6 ||
    boostPadCenterStripe.geometry.parameters.depth !== 0.42 ||
    boostPadCenterStripe.matrixAutoUpdate ||
    boostPadGantryPosts.length !== 2 ||
    boostPadGantryPosts.some((post) => post.geometry.parameters.height !== 3.1 || post.matrixAutoUpdate) ||
    !boostPadGantryBoard ||
    boostPadGantryBoard.geometry.parameters.height !== 1.58 ||
    boostPadGantryBoard.matrixAutoUpdate ||
    !boostPadGantryTop ||
    boostPadGantryTop.geometry.parameters.height !== 0.28 ||
    boostPadGantryTop.matrixAutoUpdate ||
    boostPadGantryChevrons.length !== 3 ||
    boostPadGantryChevrons.some((chevron) => chevron.geometry.parameters.depth !== 1.25 || chevron.matrixAutoUpdate)
  ) {
    fail('Extracted track mesh helper should preserve road materials, ground sizing, arcade start grid, and boost pad geometry', {
      boostPad: {
        base: boostPadBase?.geometry?.parameters,
        children: boostPadMesh.children.length,
        position: boostPadMesh.position,
        rotation: boostPadMesh.rotation,
        chevrons: boostPadChevrons.map((chevron) => chevron.geometry?.parameters),
        centerStripe: boostPadCenterStripe?.geometry?.parameters,
        gantryBoard: boostPadGantryBoard?.geometry?.parameters,
        gantryChevrons: boostPadGantryChevrons.map((chevron) => chevron.geometry?.parameters),
        gantryPosts: boostPadGantryPosts.map((post) => post.geometry?.parameters),
        gantryTop: boostPadGantryTop?.geometry?.parameters,
      },
      trackMesh: {
        cleanCityCourse: trackMesh.cleanCityCourse,
        dimensions: trackMesh.dimensions,
        ground: trackMesh.ground.geometry.parameters,
        instancedTrackMeshCount: trackMesh.instancedTrackMeshCount,
        finishCelebrationCueCount: trackMesh.finishCelebrationCueCount,
        finishCelebrationRoadDecals: finishCelebrationRoadDecals.length,
        finishCelebrationRoadDecalPlanes: finishCelebrationRoadDecalPlanes.map((plane) => plane.geometry?.parameters),
        openingLaunchDecalCount: trackMesh.openingLaunchDecalCount,
        openingLaunchDecalLabels,
        openingLaunchDecalPlanes: openingLaunchDecalPlanes.map((plane) => plane.geometry?.parameters),
        openingLaunchPaintCount: trackMesh.openingLaunchPaintCount,
        openingLaunchPaintBatches: openingLaunchPaintBatches.length,
        openingLaunchPaintChevrons: openingLaunchPaintChevrons.length,
        openingLaunchPaintGroups: openingLaunchPaintGroups.length,
        openingLaunchPaintInstanceCount,
        openingLaunchPaintStripes: openingLaunchPaintStripes.length,
        openingSweeperDriftPaintBatches: openingSweeperDriftPaintBatches.length,
        openingSweeperDriftPaintChevrons: openingSweeperDriftPaintChevrons.length,
        openingSweeperDriftPaintCount: trackMesh.openingSweeperDriftPaintCount,
        openingSweeperDriftPaintInstanceCount,
        openingSweeperDriftPaintStripes: openingSweeperDriftPaintStripes.length,
        startTiles: trackMesh.startTiles.length,
        visualSegmentCount: trackMesh.visualSegmentCount,
        worldChildren: trackMeshWorld.children.length,
      },
      expectedCleanVisualSegmentCount,
      sourceVisualSegmentCount,
      syntheticVisualSegments: syntheticVisualSegments.map((segment) => ({
        length: segment.length,
        sourceCount: segment.sourceCount,
      })),
      cappedVisualSegments: cappedVisualSegments.map((segment) => ({
        length: segment.length,
        sourceCount: segment.sourceCount,
      })),
      nonCleanInstancedTrackMeshCount: nonCleanTrackMesh.instancedTrackMeshCount,
      trackRenderMaterials,
      visualTrackSegments: visualTrackSegments.length,
    });
  }

  const sceneryWorld = new THREE.Group();
  const sceneryColliders = [];
  const sceneryCollisionCircles = [];
  const sceneryDrawCalls = [];
  const sceneryDocumentRef = {
    createElement: (tagName) => {
      if (tagName !== 'canvas') fail('Race scenery helper should only create canvas labels', { tagName });
      return {
        getContext: () => ({
          beginPath: () => sceneryDrawCalls.push({ type: 'beginPath' }),
          closePath: () => sceneryDrawCalls.push({ type: 'closePath' }),
          fill: () => sceneryDrawCalls.push({ type: 'fill' }),
          fillRect: (...args) => sceneryDrawCalls.push({ args, type: 'fillRect' }),
          fillText: (...args) => sceneryDrawCalls.push({ args, type: 'fillText' }),
          lineTo: (...args) => sceneryDrawCalls.push({ args, type: 'lineTo' }),
          moveTo: (...args) => sceneryDrawCalls.push({ args, type: 'moveTo' }),
          stroke: () => sceneryDrawCalls.push({ type: 'stroke' }),
          strokeRect: (...args) => sceneryDrawCalls.push({ args, type: 'strokeRect' }),
          translate: (...args) => sceneryDrawCalls.push({ args, type: 'translate' }),
          set fillStyle(value) {
            sceneryDrawCalls.push({ type: 'fillStyle', value });
          },
          set font(value) {
            sceneryDrawCalls.push({ type: 'font', value });
          },
          set lineWidth(value) {
            sceneryDrawCalls.push({ type: 'lineWidth', value });
          },
          set strokeStyle(value) {
            sceneryDrawCalls.push({ type: 'strokeStyle', value });
          },
          set textAlign(value) {
            sceneryDrawCalls.push({ type: 'textAlign', value });
          },
          set textBaseline(value) {
            sceneryDrawCalls.push({ type: 'textBaseline', value });
          },
        }),
      };
    },
  };
  const sceneryCompiled = {
    ...trackMeshCompiled,
    branchRoutes: [],
    collisionZones: [{ key: 'unit-zone', position: { x: 4, z: 6 }, radius: 7 }],
    courseV2: null,
    districtAnchors: null,
    scenery: [{ color: '#123abc', h: 120, kind: 'lighthouse', w: 100, x: 512, y: 384 }],
  };
  const sceneryResult = createRaceScenery({
    asphaltMat: trackMesh.materials.asphaltMat,
    bounds: trackMesh.dimensions.bounds,
    cleanCityCourse: false,
    collisionCircles: sceneryCollisionCircles,
    compiled: sceneryCompiled,
    defaultRaceCityDistricts: [
      {
        accent: '#80ff62',
        base: '#3ca75b',
        dark: '#1f5f35',
        icon: 'dumbbell',
        label: 'GYM',
        progress: 0.2,
        roof: '#e9f7ce',
        setback: 30,
        side: 1,
      },
    ],
    documentRef: sceneryDocumentRef,
    railPostMat: trackMesh.materials.railPostMat,
    registerCameraCollider: (object) => {
      sceneryColliders.push(object);
      return object;
    },
    trackCenterX: trackMesh.dimensions.trackCenterX,
    trackCenterZ: trackMesh.dimensions.trackCenterZ,
    trackSpanX: trackMesh.dimensions.trackSpanX,
    trackSpanZ: trackMesh.dimensions.trackSpanZ,
    visualPalette: { cyan: '#46d9ef', roadLine: '#ffd34f' },
    world: sceneryWorld,
  });
  sceneryWorld.userData.cityAnimationHooks[0]?.userData.animate?.(120, 0.016);
  let frozenSceneryObjects = 0;
  let instancedSceneryMeshes = 0;
  sceneryWorld.traverse((object) => {
    if (object !== sceneryWorld && object.matrixAutoUpdate === false) frozenSceneryObjects += 1;
    if (object.isInstancedMesh) instancedSceneryMeshes += 1;
  });
  const districtHook = sceneryResult.animationHooks[0];
  const objectiveHook = sceneryResult.animationHooks[1];
  if (
    sceneryResult.animationHooks !== sceneryWorld.userData.cityAnimationHooks ||
    sceneryResult.animationHooks.length !== 2 ||
    sceneryResult.worldChildCount !== sceneryWorld.children.length ||
    sceneryResult.collisionCircleCount !== sceneryCollisionCircles.length ||
    sceneryColliders.length < 20 ||
    sceneryColliders.length > 45 ||
    instancedSceneryMeshes < 16 ||
    frozenSceneryObjects < 120 ||
    districtHook.matrixAutoUpdate ||
    !districtHook.userData.portalRing.matrixAutoUpdate ||
    !districtHook.userData.innerRing.matrixAutoUpdate ||
    !districtHook.userData.portal.matrixAutoUpdate ||
    objectiveHook.matrixAutoUpdate ||
    !objectiveHook.userData.beam.matrixAutoUpdate ||
    !objectiveHook.userData.badge.matrixAutoUpdate ||
    !objectiveHook.userData.padRing.matrixAutoUpdate ||
    !sceneryWorld.children.some((child) => child.userData.kind === 'lighthouse') ||
    !sceneryCollisionCircles.some((circle) => circle.key === 'unit-zone' && circle.radius === 7) ||
    !sceneryDrawCalls.some((entry) => entry.type === 'fillText' && entry.args[0] === 'LIGHTHOUSE') ||
    !sceneryDrawCalls.some((entry) => entry.type === 'fillText' && entry.args[0] === 'GYM') ||
    typeof sceneryResult.animationHooks[0]?.userData.animate !== 'function'
  ) {
    fail('Extracted race scenery helper should preserve landmarks, district hooks, colliders, collision circles, and canvas labels', {
      animationHooks: sceneryResult.animationHooks.length,
      collisionCircleCount: sceneryResult.collisionCircleCount,
      colliders: sceneryColliders.length,
      drawCalls: sceneryDrawCalls.filter((entry) => entry.type === 'fillText'),
      frozenSceneryObjects,
      instancedSceneryMeshes,
      worldChildren: sceneryResult.worldChildCount,
    });
  }

  const cleanStorefrontWorld = new THREE.Group();
  const cleanStorefrontDrawCalls = [];
  const cleanStorefrontDocumentRef = {
    createElement: (tagName) => {
      if (tagName !== 'canvas') fail('Clean storefront helper should only create canvas labels', { tagName });
      return {
        getContext: () => ({
          beginPath: () => cleanStorefrontDrawCalls.push({ type: 'beginPath' }),
          closePath: () => cleanStorefrontDrawCalls.push({ type: 'closePath' }),
          fill: () => cleanStorefrontDrawCalls.push({ type: 'fill' }),
          fillRect: (...args) => cleanStorefrontDrawCalls.push({ args, type: 'fillRect' }),
          fillText: (...args) => cleanStorefrontDrawCalls.push({ args, type: 'fillText' }),
          lineTo: (...args) => cleanStorefrontDrawCalls.push({ args, type: 'lineTo' }),
          moveTo: (...args) => cleanStorefrontDrawCalls.push({ args, type: 'moveTo' }),
          stroke: () => cleanStorefrontDrawCalls.push({ type: 'stroke' }),
          strokeRect: (...args) => cleanStorefrontDrawCalls.push({ args, type: 'strokeRect' }),
          translate: (...args) => cleanStorefrontDrawCalls.push({ args, type: 'translate' }),
          set fillStyle(value) {
            cleanStorefrontDrawCalls.push({ type: 'fillStyle', value });
          },
          set font(value) {
            cleanStorefrontDrawCalls.push({ type: 'font', value });
          },
          set lineWidth(value) {
            cleanStorefrontDrawCalls.push({ type: 'lineWidth', value });
          },
          set strokeStyle(value) {
            cleanStorefrontDrawCalls.push({ type: 'strokeStyle', value });
          },
          set textAlign(value) {
            cleanStorefrontDrawCalls.push({ type: 'textAlign', value });
          },
          set textBaseline(value) {
            cleanStorefrontDrawCalls.push({ type: 'textBaseline', value });
          },
        }),
      };
    },
  };
  const cleanStorefrontSceneryResult = createRaceScenery({
    asphaltMat: trackMesh.materials.asphaltMat,
    bounds: trackMesh.dimensions.bounds,
    cleanCityCourse: true,
    collisionCircles: [],
    compiled: sceneryCompiled,
    documentRef: cleanStorefrontDocumentRef,
    railPostMat: trackMesh.materials.railPostMat,
    registerCameraCollider: (object) => object,
    trackCenterX: trackMesh.dimensions.trackCenterX,
    trackCenterZ: trackMesh.dimensions.trackCenterZ,
    trackSpanX: trackMesh.dimensions.trackSpanX,
    trackSpanZ: trackMesh.dimensions.trackSpanZ,
    visualPalette: { cyan: '#46d9ef', food: '#ffac32', garage: '#2cc8ff', lab: '#d45cff', roadLine: '#ffd34f' },
    world: cleanStorefrontWorld,
  });
  const openingStorefronts = [];
  const openingStorefrontLabels = [];
  const openingStorefrontWindows = [];
  const openingStorefrontAwnings = [];
  const openingPennantRuns = [];
  const openingPennantLabels = [];
  const openingPennantFlags = [];
  const openingPennantPosts = [];
  const openingPennantCords = [];
  const openingTreeInstancedMeshes = [];
  cleanStorefrontWorld.traverse((object) => {
    if (object.userData?.kind === 'arcade-storefront-strip') openingStorefronts.push(object);
    if (object.userData?.kind === 'arcade-storefront-label') openingStorefrontLabels.push(object);
    if (object.userData?.kind === 'arcade-storefront-window') openingStorefrontWindows.push(object);
    if (object.userData?.kind === 'arcade-storefront-awning') openingStorefrontAwnings.push(object);
    if (object.userData?.kind === 'opening-pennant-run') openingPennantRuns.push(object);
    if (object.userData?.kind === 'opening-pennant-label') openingPennantLabels.push(object);
    if (object.userData?.kind === 'opening-pennant-flag') openingPennantFlags.push(object);
    if (object.userData?.kind === 'opening-pennant-post') openingPennantPosts.push(object);
    if (object.userData?.kind === 'opening-pennant-cord') openingPennantCords.push(object);
    if (object.userData?.kind?.startsWith('opening-tree-')) openingTreeInstancedMeshes.push(object);
  });
  const openingStorefrontWindowInstanceCount = openingStorefrontWindows.reduce(
    (total, mesh) => total + (mesh.userData?.instanceCount || mesh.count || 0),
    0
  );
  const openingStorefrontAwningInstanceCount = openingStorefrontAwnings.reduce(
    (total, mesh) => total + (mesh.userData?.instanceCount || mesh.count || 0),
    0
  );
  const openingPennantFlagInstanceCount = openingPennantFlags.reduce(
    (total, mesh) => total + (mesh.userData?.instanceCount || mesh.count || 0),
    0
  );
  const openingPennantPostInstanceCount = openingPennantPosts.reduce(
    (total, mesh) => total + (mesh.userData?.instanceCount || mesh.count || 0),
    0
  );
  const openingPennantCordInstanceCount = openingPennantCords.reduce(
    (total, mesh) => total + (mesh.userData?.instanceCount || mesh.count || 0),
    0
  );
  if (
    cleanStorefrontSceneryResult.openingTreeCount !== 6 ||
    openingStorefronts.length !== 3 ||
    openingStorefrontLabels.length !== 3 ||
    openingStorefrontWindows.length !== 1 ||
    openingStorefrontWindowInstanceCount !== 9 ||
    openingStorefrontWindows.some(
      (mesh) => !mesh.isInstancedMesh || mesh.matrixAutoUpdate || mesh.userData.sourceKind !== 'opening-static-decoration'
    ) ||
    openingStorefrontAwnings.length !== 6 ||
    openingStorefrontAwningInstanceCount !== 9 ||
    openingStorefrontAwnings.some(
      (mesh) => !mesh.isInstancedMesh || mesh.matrixAutoUpdate || mesh.userData.sourceKind !== 'opening-static-decoration'
    ) ||
    openingPennantRuns.length !== 3 ||
    openingPennantLabels.length !== 3 ||
    openingPennantFlags.length !== 3 ||
    openingPennantFlagInstanceCount !== 21 ||
    openingPennantFlags.some(
      (mesh) => !mesh.isInstancedMesh || mesh.matrixAutoUpdate || mesh.userData.sourceKind !== 'opening-static-decoration'
    ) ||
    openingPennantPosts.length !== 1 ||
    openingPennantPostInstanceCount !== 6 ||
    openingPennantPosts.some(
      (mesh) => !mesh.isInstancedMesh || mesh.matrixAutoUpdate || mesh.userData.sourceKind !== 'opening-static-decoration'
    ) ||
    openingPennantCords.length !== 1 ||
    openingPennantCordInstanceCount !== 3 ||
    openingPennantCords.some(
      (mesh) => !mesh.isInstancedMesh || mesh.matrixAutoUpdate || mesh.userData.sourceKind !== 'opening-static-decoration'
    ) ||
    openingTreeInstancedMeshes.length !== 3 ||
    openingTreeInstancedMeshes.some((mesh) => !mesh.isInstancedMesh || mesh.matrixAutoUpdate) ||
    openingTreeInstancedMeshes.reduce((total, mesh) => total + mesh.count, 0) !== 12 ||
    !openingTreeInstancedMeshes.some(
      (mesh) => mesh.userData.kind === 'opening-tree-trunks' && mesh.geometry.parameters.height === 5.6
    ) ||
    !openingTreeInstancedMeshes.some(
      (mesh) => mesh.userData.kind === 'opening-tree-crowns' && mesh.geometry.parameters.radius === 3.45
    ) ||
    !openingTreeInstancedMeshes.some(
      (mesh) => mesh.userData.kind === 'opening-tree-highlight-crowns' && mesh.geometry.parameters.radius === 3.2
    ) ||
    openingStorefronts.some((group) => group.matrixAutoUpdate || !group.userData.label) ||
    openingPennantRuns.some((group) => group.matrixAutoUpdate || !group.userData.label) ||
    openingStorefrontLabels.some((label) => label.scale.y !== 3 || label.material.depthTest) ||
    openingPennantLabels.some((label) => label.scale.y !== 3.4 || label.material.depthTest) ||
    !cleanStorefrontDrawCalls.some((entry) => entry.type === 'fillText' && entry.args[0] === 'TURBO MART') ||
    !cleanStorefrontDrawCalls.some((entry) => entry.type === 'fillText' && entry.args[0] === 'PIT SHOP') ||
    !cleanStorefrontDrawCalls.some((entry) => entry.type === 'fillText' && entry.args[0] === 'DRIFT CAFE') ||
    !cleanStorefrontDrawCalls.some((entry) => entry.type === 'fillText' && entry.args[0] === 'COMEBACK CUP') ||
    !cleanStorefrontDrawCalls.some((entry) => entry.type === 'fillText' && entry.args[0] === 'BOOST ROW') ||
    !cleanStorefrontDrawCalls.some((entry) => entry.type === 'fillText' && entry.args[0] === 'DRIFT LANE')
  ) {
    fail('Clean Comeback City scenery should include low-cost arcade storefront strips, opening pennants, and readable labels', {
      drawCalls: cleanStorefrontDrawCalls.filter((entry) => entry.type === 'fillText'),
      labels: openingStorefrontLabels.map((label) => label.scale),
      openingPennantCords: openingPennantCords.map((mesh) => mesh.userData),
      openingPennantFlags: openingPennantFlags.map((mesh) => mesh.userData),
      openingPennantPosts: openingPennantPosts.map((mesh) => mesh.userData),
      openingStorefrontAwnings: openingStorefrontAwnings.map((mesh) => mesh.userData),
      openingStorefrontWindows: openingStorefrontWindows.map((mesh) => mesh.userData),
      openingTreeCount: cleanStorefrontSceneryResult.openingTreeCount,
      openingTrees: openingTreeInstancedMeshes.map((mesh) => ({
        count: mesh.count,
        geometry: mesh.geometry?.parameters,
        kind: mesh.userData.kind,
      })),
      pennants: openingPennantRuns.map((group) => group.userData),
      storefronts: openingStorefronts.map((group) => group.userData),
    });
  }

  const pickupWorld = new THREE.Group();
  const trackBananaMaterial = createTrackBananaMaterial();
  const droppedBananaMaterial = createDroppedBananaMaterial();
  const pickupBanana = { position: new THREE.Vector3(1, 0, 2) };
  const trackBananaMesh = createTrackBananaMesh({
    banana: pickupBanana,
    material: trackBananaMaterial,
    world: pickupWorld,
  });
  const itemBoxMesh = createItemBoxMesh({
    balloon: {
      position: new THREE.Vector3(3, 0, 4),
      type: { color: '#abcdef' },
    },
    world: pickupWorld,
  });
  const flightGateMesh = createFlightGateMesh({
    cleanCityCourse: true,
    compiled: { accent: '#123456', roadWidth: 40 },
    defaultVehicle: 'kart',
    gate: {
      altitude: 15,
      position: new THREE.Vector3(5, 0, 6),
      tangent: new THREE.Vector3(1, 0, 0),
    },
    index: 0,
    world: pickupWorld,
  });
  const switchPadMesh = createSwitchPadMesh({
    pad: {
      layer: 'hybrid',
      position: new THREE.Vector3(7, 0, 8),
      tangent: new THREE.Vector3(0, 0, 1),
      targetVehicle: 'hover',
    },
    world: pickupWorld,
  });
  const trackHazardMesh = createTrackHazardMesh({
    hazard: {
      layer: 'air',
      position: new THREE.Vector3(9, 0, 10),
      radius: 10,
      type: 'wet',
    },
    world: pickupWorld,
  });
  const droppedBananaMesh = createDroppedBananaMesh({
    banana: { position: new THREE.Vector3(11, 0, 12) },
    material: droppedBananaMaterial,
    world: pickupWorld,
  });
  const droppedTrapMesh = createDroppedTrapMesh({
    hazard: { position: new THREE.Vector3(13, 0, 14) },
    itemKey: 'bubbleTrap',
    level: 2,
    world: pickupWorld,
  });
  const pickupBatchWorld = new THREE.Group();
  const pickupBatch = createRacePickupMeshes({
    cleanCityCourse: false,
    compiled: { accent: '#123456', roadWidth: 40 },
    defaultVehicle: 'plane',
    race: {
      balloons: [{ position: new THREE.Vector3(), type: { color: '#ff0000' } }],
      bananas: [{ position: new THREE.Vector3() }],
      flightGates: [
        {
          altitude: 12,
          position: new THREE.Vector3(),
          tangent: new THREE.Vector3(0, 0, 1),
        },
      ],
      switchPads: [
        {
          layer: 'ground',
          position: new THREE.Vector3(),
          tangent: new THREE.Vector3(0, 0, 1),
          targetVehicle: 'kart',
        },
      ],
      trackHazards: [
        {
          layer: 'ground',
          position: new THREE.Vector3(),
          radius: 8,
          type: 'pulseZone',
        },
      ],
    },
    world: pickupBatchWorld,
  });
  const cleanPickupBatchWorld = new THREE.Group();
  const cleanPickupBatch = createRacePickupMeshes({
    cleanCityCourse: true,
    compiled: { accent: '#123456', roadWidth: 40 },
    defaultVehicle: 'kart',
    race: {
      balloons: [{ position: new THREE.Vector3(), type: { color: '#ff0000' } }],
      bananas: [{ position: new THREE.Vector3() }],
      flightGates: [
        {
          altitude: 12,
          position: new THREE.Vector3(),
          tangent: new THREE.Vector3(0, 0, 1),
        },
      ],
      switchPads: [
        {
          layer: 'ground',
          position: new THREE.Vector3(),
          tangent: new THREE.Vector3(0, 0, 1),
          targetVehicle: 'kart',
        },
      ],
      trackHazards: [
        {
          layer: 'ground',
          position: new THREE.Vector3(),
          radius: 8,
          type: 'pulseZone',
        },
      ],
    },
    world: cleanPickupBatchWorld,
  });
  if (
    trackBananaMaterial.color.getHexString() !== 'ffd34f' ||
    trackBananaMaterial.emissiveIntensity !== 0.16 ||
    droppedBananaMaterial.emissiveIntensity !== 0.18 ||
    trackBananaMesh.parent !== pickupWorld ||
    trackBananaMesh.position.x !== 1 ||
    trackBananaMesh.position.y !== 1.25 ||
    trackBananaMesh.children.length !== 1 ||
    trackBananaMesh.children[0].geometry.parameters.radius !== 0.8 ||
    itemBoxMesh.position.y !== 3.25 ||
    itemBoxMesh.children.length !== 1 ||
    itemBoxMesh.children[0].geometry.parameters.width !== 2.7 ||
    itemBoxMesh.children[0].material.color.getHexString() !== 'abcdef' ||
    itemBoxMesh.children[0].material.emissiveIntensity !== 0.92 ||
    flightGateMesh.group.position.y !== 15 ||
    Math.abs(flightGateMesh.group.rotation.y - Math.PI / 2) > 0.001 ||
    flightGateMesh.group.visible ||
    flightGateMesh.group.children.length !== 7 ||
    flightGateMesh.ring.material.opacity !== 0.72 ||
    flightGateMesh.glow.material.opacity !== 0.14 ||
    switchPadMesh.position.y !== 0.52 + layerAltitude('hybrid') * 0.12 ||
    switchPadMesh.children.length !== 2 ||
    switchPadMesh.children[0].material.color.getHexString() !== '4ade80' ||
    trackHazardMesh.geometry.type !== 'CylinderGeometry' ||
    trackHazardMesh.material.color.getHexString() !== 'f45b69' ||
    trackHazardMesh.position.y !== 0.72 + layerAltitude('air') * 0.22 ||
    !trackHazardMesh.castShadow ||
    droppedBananaMesh.position.y !== 1.08 ||
    droppedBananaMesh.children[0].geometry.parameters.radius !== 0.62 ||
    droppedTrapMesh.geometry.type !== 'SphereGeometry' ||
    Math.abs(droppedTrapMesh.geometry.parameters.radius - 2.48) > 0.001 ||
    droppedTrapMesh.position.y !== 3.1 ||
    !droppedTrapMesh.material.transparent ||
    droppedTrapMesh.material.opacity !== 0.62 ||
    pickupBatch.bananaMeshes.length !== 1 ||
    pickupBatch.balloonMeshes.length !== 1 ||
    pickupBatch.flightGateMeshes.length !== 1 ||
    pickupBatch.switchPadMeshes.length !== 1 ||
    pickupBatch.trackHazardMeshes.length !== 1 ||
    pickupBatchWorld.children.length !== 5 ||
    cleanPickupBatch.bananaMeshes.length !== 1 ||
    cleanPickupBatch.balloonMeshes.length !== 1 ||
    cleanPickupBatch.flightGateMeshes.length !== 0 ||
    cleanPickupBatch.switchPadMeshes.length !== 0 ||
    cleanPickupBatch.trackHazardMeshes.length !== 1 ||
    cleanPickupBatchWorld.children.length !== 3
  ) {
    fail('Extracted race pickup mesh helpers should preserve banana, item box, gate, switch pad, hazard, dropped banana, and trap geometry', {
      cleanPickupBatch,
      cleanPickupWorldChildren: cleanPickupBatchWorld.children.length,
      droppedBananaMesh,
      droppedTrapMesh,
      flightGate: flightGateMesh,
      itemBoxMesh,
      pickupBatch,
      pickupWorldChildren: pickupWorld.children.length,
      switchPadMesh,
      trackBananaMesh,
      trackHazardMesh,
    });
  }

  const raceProfile = { label: 'Unit profile' };
  const raceState = createRaceState(compiledLegacyTrack, raceProfile, 'kart');
  const planeRaceState = createRaceState(compiledLegacyTrack, raceProfile, 'plane');
  if (
    raceState.profile !== raceProfile ||
    raceState.defaultVehicle !== 'kart' ||
    raceState.player.vehicleMode !== 'kart' ||
    raceState.player.flightAltitude !== 0 ||
    raceState.player.lap !== 1 ||
    raceState.player.rank !== 1 ||
    Math.abs(raceState.player.heading - Math.PI / 2) > 0.001 ||
    raceState.player.position.x !== 0 ||
    raceState.player.position.z !== 0 ||
    raceState.player.stuckProbePosition === raceState.player.position ||
    raceState.player.velocity.length() !== 0 ||
    raceState.rivals.length !== 2 ||
    raceState.rivals[0].name !== 'Rival A' ||
    raceState.rivals[0].rank !== 2 ||
    raceState.rivals[0].vehicleMode !== 'kart' ||
    Math.abs(raceState.rivals[0].lane + compiledLegacyTrack.roadWidth * 0.24) > 0.001 ||
    Math.abs(raceState.rivals[0].progress - 0.018) > 0.001 ||
    raceState.rivals[1].speed !== 27.8 ||
    raceState.bananas.length !== 3 ||
    Math.abs(raceState.bananas[0].progress - 0.035) > 0.001 ||
    raceState.balloons.length !== 1 ||
    raceState.balloons[0].type !== BALLOON_TYPES[0] ||
    raceState.balloons[0].type.key !== 'red' ||
    raceState.balloons[0].cooldown !== 0 ||
    raceState.zippers.length !== 1 ||
    raceState.zippers[0].progress !== 0.5 ||
    raceState.zippers[0].index !== 0 ||
    raceState.flightGates.length !== 10 ||
    Math.abs(raceState.flightGates[0].altitude - (FLIGHT_ALTITUDE_LIMITS.cruise - 2.2)) > 0.001 ||
    raceState.switchPads.length !== 1 ||
    raceState.switchPads[0].targetVehicle !== 'plane' ||
    raceState.switchPads[0].cooldown !== 0 ||
    raceState.trackHazards.length !== 1 ||
    raceState.trackHazards[0].definition?.effect !== 'slow' ||
    raceState.trackHazards[0].cooldown !== 0 ||
    raceState.trackHazards[0].eventPulse !== 0 ||
    raceState.droppedBananas.length !== 0 ||
    raceState.droppedHazards.length !== 0 ||
    Object.keys(raceState.eventCooldowns).length !== 0 ||
    raceState.finished ||
    raceState.time !== 0 ||
    planeRaceState.player.flightAltitude !== FLIGHT_ALTITUDE_LIMITS.cruise ||
    planeRaceState.player.vehicleMode !== 'plane'
  ) {
    fail('Extracted race state helper should preserve initial player, rival, pickup, boost, gate, switch, and hazard state', {
      planePlayer: planeRaceState.player,
      raceState: {
        balloons: raceState.balloons,
        flightGates: raceState.flightGates.slice(0, 2),
        player: raceState.player,
        rivals: raceState.rivals,
        trackHazards: raceState.trackHazards,
        zippers: raceState.zippers,
      },
    });
  }

  const driftVisualPlaytest = {
    enabled: true,
    mode: 'visual-kart',
    visualScenario: VISUAL_KART_MANUAL_SCENARIOS.driftMechanics,
  };
  const steeringVisualPlaytest = {
    enabled: true,
    mode: 'visual-kart',
    visualScenario: VISUAL_KART_MANUAL_SCENARIOS.steeringHighSpeed,
  };
  const resetCalls = [];
  const visualScenarioPlayer = {
    bananas: 9,
    boostSource: 'pad',
    boostTier: 2,
    boostTimer: 1,
    driftActive: true,
    driftCharge: 1.4,
    heading: 0,
    hitTimer: 1,
    jumpHeight: 2,
    jumpVelocity: 3,
    position: new THREE.Vector3(),
    progress: 0,
    steerInput: 0.4,
    velocity: new THREE.Vector3(4, 0, 0),
  };
  const visualScenarioSample = {
    point: new THREE.Vector3(2, 0, 4),
    progress: 0.42,
    tangent: new THREE.Vector3(0.6, 0, 0.8),
  };
  const visualScenarioPosition = new THREE.Vector3(7, 0, 9);
  resetKartPlayerForVisualScenario({
    player: visualScenarioPlayer,
    position: visualScenarioPosition,
    sample: visualScenarioSample,
    setVehicleMode: (...args) => resetCalls.push(args),
    vehicle: { maxSpeed: 50 },
    velocityRatio: 0.52,
  });
  const driftFlags = manualVisualScenarioFlags(driftVisualPlaytest);
  const steeringFlags = manualVisualScenarioFlags(steeringVisualPlaytest);
  if (
    !visualKartScenarioMatches(driftVisualPlaytest, VISUAL_KART_MANUAL_SCENARIOS.driftMechanics) ||
    visualKartScenarioMatches({ ...driftVisualPlaytest, enabled: false }, VISUAL_KART_MANUAL_SCENARIOS.driftMechanics) ||
    !visualScenarioUsesHeadingCamera(driftVisualPlaytest) ||
    !visualScenarioUsesHeadingCamera(steeringVisualPlaytest) ||
    visualScenarioUsesHeadingCamera({
      enabled: true,
      mode: 'visual-kart',
      visualScenario: VISUAL_KART_MANUAL_SCENARIOS.acceleration,
    }) ||
    !driftFlags.driftMechanics ||
    driftFlags.acceleration ||
    !steeringFlags.steering ||
    steeringFlags.reverse ||
    manualVisualScenarioPrimedKey(VISUAL_KART_MANUAL_SCENARIOS.boostPadMechanics) !== 'boostPadMechanicsPrimed' ||
    manualVisualScenarioPrimedKey(VISUAL_KART_MANUAL_SCENARIOS.steeringLowSpeed) !== 'steeringPrimed' ||
    manualVisualScenarioPrimedKey('idle') !== null ||
    manualVisualScenarioIsPrimed(driftVisualPlaytest) ||
    !manualVisualScenarioIsPrimed({ ...driftVisualPlaytest, driftMechanicsPrimed: true }) ||
    manualVisualScenarioIsPrimed({ ...driftVisualPlaytest, enabled: false, driftMechanicsPrimed: true }) ||
    steeringScenarioSpeedRatio(VISUAL_KART_MANUAL_SCENARIOS.steeringLowSpeed) !== 0.3 ||
    steeringScenarioSpeedRatio(VISUAL_KART_MANUAL_SCENARIOS.steeringHighSpeed) !== 0.8 ||
    steeringScenarioSpeedRatio(VISUAL_KART_MANUAL_SCENARIOS.acceleration) !== null ||
    resetCalls.length !== 1 ||
    resetCalls[0][0] !== visualScenarioPlayer ||
    resetCalls[0][1] !== 'kart' ||
    !resetCalls[0][2]?.force ||
    visualScenarioPlayer.bananas !== 0 ||
    visualScenarioPlayer.boostTimer !== 0 ||
    visualScenarioPlayer.boostTier !== 0 ||
    visualScenarioPlayer.boostSource !== null ||
    visualScenarioPlayer.driftActive ||
    visualScenarioPlayer.driftCharge !== 0 ||
    visualScenarioPlayer.hitTimer !== 0 ||
    visualScenarioPlayer.jumpHeight !== 0 ||
    visualScenarioPlayer.jumpVelocity !== 0 ||
    visualScenarioPlayer.progress !== visualScenarioSample.progress ||
    visualScenarioPlayer.position.x !== visualScenarioPosition.x ||
    visualScenarioPlayer.position.z !== visualScenarioPosition.z ||
    Math.abs(visualScenarioPlayer.heading - Math.atan2(0.6, 0.8)) > 0.001 ||
    visualScenarioPlayer.steerInput !== 0 ||
    Math.abs(visualScenarioPlayer.velocity.length() - 26) > 0.001
  ) {
    fail('Extracted visual scenario helpers should preserve scenario predicates and shared kart reset behavior', {
      driftFlags,
      resetCalls,
      steeringFlags,
      visualScenarioPlayer,
    });
  }

  const makeVisualPrimerPlayer = () => ({
    bananas: 5,
    boostSource: 'pad',
    boostTier: 2,
    boostTimer: 1,
    doubleSlotUses: 2,
    driftActive: true,
    driftCharge: 1.2,
    driftDirection: 1,
    driftHopTimer: 0.2,
    ghostTimer: 1,
    heading: 0,
    heldBalloon: { key: 'boost' },
    heldItem: { key: 'boost', level: 2 },
    hitTimer: 0.5,
    invincibleTimer: 1,
    jumpCooldown: 0.4,
    jumpHeight: 1,
    jumpVelocity: 2,
    position: new THREE.Vector3(1, 0, 1),
    progress: 0,
    secondaryHeldItem: { key: 'shield', level: 1 },
    steerInput: 0.5,
    stuckProbePosition: null,
    stuckRecoveryCooldown: 1,
    stuckTimer: 2,
    velocity: new THREE.Vector3(8, 0, 0),
  });
  const visualPrimerCompiled = {
    roadWidth: 10,
    startProgress: 0.012,
    nearest(position) {
      return {
        distance: Math.hypot(position.x, position.z),
        point: new THREE.Vector3(0, 0, 0),
        progress: 0.2,
        roadWidth: 10,
        tangent: new THREE.Vector3(0, 0, 1),
      };
    },
    pointAt(progress) {
      return {
        point: new THREE.Vector3(progress * 100, 0, progress * 40),
        progress,
        roadWidth: 10,
        tangent: new THREE.Vector3(0, 0, 1),
      };
    },
  };
  const makeVisualPrimerStats = () => ({
    boostPadActivationDelay: 3,
    boostPadActivationTime: 4,
    boostPadProbeStartTime: null,
    boostPadSpeedAfter: 0.5,
    boostPadSpeedBefore: 0.4,
    boostSeen: true,
    boostSource: 'pad',
    boostSourcesSeen: { pad: true },
    brakingStartTime: 1,
    collisionCount: 7,
    collisionImpactTime: 3,
    collisionSpeedAfter: 0.2,
    collisionSpeedBefore: 0.7,
    collisionSpeedLossRatio: 0.5,
    driftHopDuration: 0.3,
    driftHopStartCount: 4,
    driftHopStartTime: 2,
    driftStartCount: 5,
    driftTierSeen: 1,
    itemBoxPickupDelay: 2,
    itemBoxPickupKey: 'boost',
    itemBoxPickupTime: 3,
    itemBoxProbeStartTime: null,
    itemBoxSourceType: 'blue',
    offroadSlowdownSeen: true,
    offroadSpeedAfter: 0.6,
    offroadSpeedBefore: null,
    offroadSpeedLossRatio: 0.3,
    reverseSpeedCapRatio: null,
    reverseSpeedRatio: 1,
    reverseTuningRatio: null,
    steeringStartHeading: null,
    steeringStartTime: null,
    steeringTurn90Time: 1,
    steeringTurnDegrees: 20,
    timeFromTopSpeedTo25: 2,
    timeToSpeed80: 3,
    timeToSpeed98: 4,
  });
  const primeScenario = (visualScenario, options = {}) => {
    const playtest = {
      enabled: true,
      mode: 'visual-kart',
      visualScenario,
    };
    const race = {
      balloons: [{ cooldown: 4, position: new THREE.Vector3(8, 0, 2), progress: 0.08 }],
      player: makeVisualPrimerPlayer(),
      time: 6.5,
      zippers: [{ cooldown: 5, progress: 0.095 }],
      ...options.race,
    };
    const visualStats = makeVisualPrimerStats();
    const modeCalls = [];
    const scenarioResult = primeVisualKartScenario({
      collisionCircles: options.collisionCircles || [{ position: new THREE.Vector3(20, 0, 0), radius: 10 }],
      compiled: visualPrimerCompiled,
      normalizedSpeedFor,
      playtest,
      race,
      setVehicleMode: (racer, mode, settings) => {
        modeCalls.push([racer, mode, settings]);
        racer.vehicleMode = mode;
      },
      vehicles: VEHICLES,
      visualStats,
    });
    return { modeCalls, playtest, race, scenarioResult, visualStats };
  };
  const accelerationPrimer = primeScenario(VISUAL_KART_MANUAL_SCENARIOS.acceleration);
  const brakingPrimer = primeScenario(VISUAL_KART_MANUAL_SCENARIOS.braking);
  const reversePrimer = primeScenario(VISUAL_KART_MANUAL_SCENARIOS.reverse);
  const boostPadPrimer = primeScenario(VISUAL_KART_MANUAL_SCENARIOS.boostPadMechanics);
  const collisionPrimer = primeScenario(VISUAL_KART_MANUAL_SCENARIOS.collisionMechanics);
  const offroadPrimer = primeScenario(VISUAL_KART_MANUAL_SCENARIOS.offroadSlowdown);
  const itemBoxPrimer = primeScenario(VISUAL_KART_MANUAL_SCENARIOS.itemBoxMechanics);
  const driftPrimer = primeScenario(VISUAL_KART_MANUAL_SCENARIOS.driftMechanics);
  const steeringPrimer = primeScenario(VISUAL_KART_MANUAL_SCENARIOS.steeringHighSpeed);
  const stuckPrimer = primeScenario(VISUAL_KART_MANUAL_SCENARIOS.stuckRecovery);
  if (
    accelerationPrimer.scenarioResult !== VISUAL_KART_MANUAL_SCENARIOS.acceleration ||
    !accelerationPrimer.playtest.accelerationPrimed ||
    accelerationPrimer.race.zippers[0].cooldown !== 999 ||
    accelerationPrimer.visualStats.timeToSpeed80 !== null ||
    accelerationPrimer.visualStats.timeToSpeed98 !== null ||
    accelerationPrimer.race.player.velocity.length() !== 0 ||
    !brakingPrimer.playtest.brakingPrimed ||
    Math.abs(brakingPrimer.race.player.velocity.length() - VEHICLES.kart.maxSpeed) > 0.001 ||
    brakingPrimer.visualStats.timeFromTopSpeedTo25 !== null ||
    !reversePrimer.playtest.reversePrimed ||
    reversePrimer.visualStats.reverseSpeedRatio !== 0 ||
    reversePrimer.visualStats.reverseSpeedCapRatio !== normalizedSpeedFor(VEHICLES.kart.reverse, VEHICLES.kart.maxSpeed) ||
    !boostPadPrimer.playtest.boostPadMechanicsPrimed ||
    boostPadPrimer.race.zippers[0].cooldown !== 0 ||
    Math.abs(boostPadPrimer.playtest.boostPadCaptureProgress - 0.083) > 0.001 ||
    boostPadPrimer.visualStats.boostPadProbeStartTime !== boostPadPrimer.race.time ||
    Math.abs(boostPadPrimer.race.player.velocity.length() - VEHICLES.kart.maxSpeed * 0.52) > 0.001 ||
    !collisionPrimer.playtest.collisionMechanicsPrimed ||
    collisionPrimer.visualStats.collisionCount !== 0 ||
    collisionPrimer.visualStats.collisionSpeedLossRatio !== null ||
    collisionPrimer.race.player.position.x <= 20 ||
    collisionPrimer.race.player.velocity.x >= 0 ||
    !offroadPrimer.playtest.offroadSlowdownPrimed ||
    offroadPrimer.visualStats.offroadSpeedAfter !== null ||
    offroadPrimer.visualStats.offroadSpeedBefore !== 0.9 ||
    offroadPrimer.race.player.ghostTimer !== 0 ||
    !itemBoxPrimer.playtest.itemBoxMechanicsPrimed ||
    itemBoxPrimer.race.balloons[0].cooldown !== 0 ||
    itemBoxPrimer.race.player.heldItem !== null ||
    itemBoxPrimer.visualStats.itemBoxProbeStartTime !== itemBoxPrimer.race.time ||
    !driftPrimer.playtest.driftMechanicsPrimed ||
    driftPrimer.race.player.driftDirection !== 0 ||
    driftPrimer.race.player.driftHopTimer !== 0 ||
    driftPrimer.visualStats.driftStartCount !== 0 ||
    Math.abs(driftPrimer.race.player.velocity.length() - VEHICLES.kart.maxSpeed * 0.62) > 0.001 ||
    !steeringPrimer.playtest.steeringPrimed ||
    steeringPrimer.visualStats.steeringStartTime !== steeringPrimer.race.time ||
    steeringPrimer.visualStats.steeringTurn90Time !== null ||
    Math.abs(steeringPrimer.race.player.velocity.length() - VEHICLES.kart.maxSpeed * 0.8) > 0.001 ||
    !stuckPrimer.playtest.stuckRecoveryPrimed ||
    stuckPrimer.race.player.hitTimer !== 1.35 ||
    stuckPrimer.race.player.velocity.length() !== 0 ||
    !stuckPrimer.race.player.stuckProbePosition ||
    stuckPrimer.modeCalls[0]?.[1] !== 'kart'
  ) {
    fail('Extracted visual scenario primer should preserve manual visual-playtest setup behavior', {
      accelerationPrimer,
      boostPadPrimer,
      brakingPrimer,
      collisionPrimer,
      driftPrimer,
      itemBoxPrimer,
      offroadPrimer,
      reversePrimer,
      steeringPrimer,
      stuckPrimer,
    });
  }
  const frameScenario = (visualScenario, options = {}) => {
    const playtest = {
      enabled: true,
      mode: 'visual-kart',
      visualScenario,
      ...options.playtest,
    };
    const race = {
      player: {
        ...makeVisualPrimerPlayer(),
        position: new THREE.Vector3(4, 0, 1),
        velocity: new THREE.Vector3(0, 0, 0),
        ...options.player,
      },
      time: 8.25,
      zippers: [
        {
          cooldown: 1.05,
          position: new THREE.Vector3(9.5, 0, 3.8),
          progress: 0.095,
          tangent: new THREE.Vector3(0, 0, 1),
        },
      ],
      ...options.race,
    };
    const visualStats = {
      ...makeVisualPrimerStats(),
      ...options.visualStats,
    };
    let steeringRecorderCalled = false;
    const scenarioResult = applyVisualKartScenarioFrame({
      compiled: visualPrimerCompiled,
      normalizedSpeedFor,
      playtest,
      race,
      recordSteeringTurn90: (...args) => {
        steeringRecorderCalled = true;
        options.recordSteeringTurn90?.(...args);
      },
      vehicles: VEHICLES,
      visualStats,
    });
    return { playtest, race, scenarioResult, steeringRecorderCalled, visualStats };
  };
  const reverseFrame = frameScenario(VISUAL_KART_MANUAL_SCENARIOS.reverse, {
    player: { heading: 0, velocity: new THREE.Vector3(0, 0, -VEHICLES.kart.maxSpeed * 0.23) },
    visualStats: { reverseSpeedRatio: 0.1 },
  });
  const boostPadFrame = frameScenario(VISUAL_KART_MANUAL_SCENARIOS.boostPadMechanics, {
    visualStats: { boostPadActivationTime: 7 },
  });
  const brakingFrame = frameScenario(VISUAL_KART_MANUAL_SCENARIOS.braking, {
    visualStats: { timeFromTopSpeedTo25: 0.96 },
  });
  const collisionVisualFrame = frameScenario(VISUAL_KART_MANUAL_SCENARIOS.collisionMechanics, {
    visualStats: { collisionImpactTime: 7, collisionSpeedAfter: 0.4 },
  });
  const driftFrame = frameScenario(VISUAL_KART_MANUAL_SCENARIOS.driftMechanics, {
    visualStats: { boostSourcesSeen: { drift: true } },
  });
  const offroadFrame = frameScenario(VISUAL_KART_MANUAL_SCENARIOS.offroadSlowdown, {
    player: {
      jumpHeight: 0,
      position: new THREE.Vector3(8, 0, 0),
      velocity: new THREE.Vector3(0, 0, VEHICLES.kart.maxSpeed * 0.58),
    },
    visualStats: { offroadSpeedAfter: null, offroadSpeedBefore: 0.9 },
  });
  const itemBoxApproachFrame = frameScenario(VISUAL_KART_MANUAL_SCENARIOS.itemBoxMechanics, {
    visualStats: { itemBoxPickupTime: null },
  });
  const itemBoxCaptureFrame = frameScenario(VISUAL_KART_MANUAL_SCENARIOS.itemBoxMechanics, {
    player: { progress: 0.33 },
    visualStats: { itemBoxPickupTime: 7 },
  });
  const steeringFrame = frameScenario(VISUAL_KART_MANUAL_SCENARIOS.steeringHighSpeed, {
    visualStats: { steeringTurn90Time: 1.28 },
  });
  const accelerationFrame = frameScenario(VISUAL_KART_MANUAL_SCENARIOS.acceleration);
  const stuckFrame = frameScenario(VISUAL_KART_MANUAL_SCENARIOS.stuckRecovery);
  if (
    !manualVisualScenarioIsActive(driftVisualPlaytest) ||
    manualVisualScenarioIsActive({ enabled: true, mode: 'visual-kart', visualScenario: 'idle' }) ||
    reverseFrame.scenarioResult !== VISUAL_KART_MANUAL_SCENARIOS.reverse ||
    reverseFrame.visualStats.reverseSpeedRatio !== 0.23 ||
    reverseFrame.visualStats.reverseSpeedCapRatio !== normalizedSpeedFor(VEHICLES.kart.reverse, VEHICLES.kart.maxSpeed) ||
    boostPadFrame.scenarioResult !== VISUAL_KART_MANUAL_SCENARIOS.boostPadMechanics ||
    boostPadFrame.race.player.boostSource !== 'pad' ||
    boostPadFrame.race.player.boostTimer < 0.55 ||
    boostPadFrame.race.zippers[0].cooldown !== 0 ||
    Math.abs(boostPadFrame.race.player.progress - 0.083) > 0.001 ||
    Math.abs(boostPadFrame.race.player.position.z + 3.4) > 0.001 ||
    Math.abs(boostPadFrame.race.player.velocity.length() - VEHICLES.kart.maxSpeed * 0.86) > 0.001 ||
    brakingFrame.scenarioResult !== VISUAL_KART_MANUAL_SCENARIOS.braking ||
    Math.abs(brakingFrame.race.player.velocity.length() - VEHICLES.kart.maxSpeed * 0.25) > 0.001 ||
    collisionVisualFrame.scenarioResult !== VISUAL_KART_MANUAL_SCENARIOS.collisionMechanics ||
    Math.abs(collisionVisualFrame.race.player.progress - (visualPrimerCompiled.startProgress + 0.035)) > 0.001 ||
    Math.abs(collisionVisualFrame.race.player.velocity.length() - VEHICLES.kart.maxSpeed * 0.62) > 0.001 ||
    driftFrame.scenarioResult !== VISUAL_KART_MANUAL_SCENARIOS.driftMechanics ||
    driftFrame.race.player.boostSource !== 'drift' ||
    driftFrame.race.player.boostTimer < 0.45 ||
    Math.abs(driftFrame.race.player.velocity.length() - VEHICLES.kart.maxSpeed * 0.86) > 0.001 ||
    offroadFrame.scenarioResult !== VISUAL_KART_MANUAL_SCENARIOS.offroadSlowdown ||
    offroadFrame.visualStats.offroadSpeedAfter !== 0.58 ||
    offroadFrame.visualStats.offroadSpeedLossRatio !== 0.356 ||
    Math.abs(offroadFrame.race.player.velocity.length() - VEHICLES.kart.maxSpeed * (VEHICLES.kart.offroad || 0.58)) > 0.001 ||
    itemBoxApproachFrame.scenarioResult !== VISUAL_KART_MANUAL_SCENARIOS.itemBoxMechanics ||
    Math.abs(itemBoxApproachFrame.race.player.velocity.length() - VEHICLES.kart.maxSpeed * 0.52) > 0.001 ||
    itemBoxCaptureFrame.playtest.itemBoxCaptureProgress !== 0.33 ||
    Math.abs(itemBoxCaptureFrame.race.player.velocity.length() - VEHICLES.kart.maxSpeed * 0.68) > 0.001 ||
    steeringFrame.scenarioResult !== VISUAL_KART_MANUAL_SCENARIOS.steeringHighSpeed ||
    !steeringFrame.steeringRecorderCalled ||
    !steeringFrame.playtest.steeringHoldPosition ||
    Math.abs(steeringFrame.race.player.velocity.length() - VEHICLES.kart.maxSpeed * 0.8) > 0.001 ||
    accelerationFrame.scenarioResult !== VISUAL_KART_MANUAL_SCENARIOS.acceleration ||
    stuckFrame.scenarioResult !== VISUAL_KART_MANUAL_SCENARIOS.stuckRecovery
  ) {
    fail('Extracted visual scenario frame helper should preserve manual visual-playtest stabilization behavior', {
      accelerationFrame,
      boostPadFrame,
      brakingFrame,
      collisionVisualFrame,
      driftFrame,
      itemBoxApproachFrame,
      itemBoxCaptureFrame,
      offroadFrame,
      reverseFrame,
      steeringFrame,
      stuckFrame,
    });
  }

  const speedRacer = {
    bananas: 2,
    boostSource: 'pad',
    boostTier: 1,
    boostTimer: 1,
    speed: 40,
  };
  applyBoost({
    impulse: 20,
    racer: speedRacer,
    seconds: 0.4,
    source: null,
    tier: 3,
    vehicle: { boostMax: 50 },
  });
  if (speedRacer.boostTimer !== 1 || speedRacer.boostTier !== 3 || speedRacer.boostSource !== 'pad') {
    fail('Boost stacking should preserve longer timer, raise tier, and retain existing source when no source is supplied', {
      speedRacer,
    });
  }
  if (Math.abs(speedRacer.speed - 51.6) > 0.001) {
    fail('Boost speed should be capped by boost max plus banana allowance', { speedRacer });
  }

  applyBoost({
    impulse: 1,
    racer: speedRacer,
    seconds: 1.2,
    source: 'drift',
    tier: 2,
    vehicle: { boostMax: 60 },
  });
  if (speedRacer.boostTimer !== 1.2 || speedRacer.boostTier !== 3 || speedRacer.boostSource !== 'drift') {
    fail('Boost stacking should extend timer and update explicit source without lowering tier', { speedRacer });
  }
  const coolingBoostPad = { cooldown: 0.1 };
  const coolingBoostPadResult = resolveBoostPadForFrame({
    controlsThrottle: 1,
    distance: 4,
    dt: 0.05,
    speed: 20,
    zipper: coolingBoostPad,
  });
  const standardBoostPad = { cooldown: 0 };
  const standardBoostPadResult = resolveBoostPadForFrame({
    controlsThrottle: 1,
    distance: 5,
    dt: 0.1,
    speed: 20,
    zipper: standardBoostPad,
  });
  const perfectBoostPad = { cooldown: 0 };
  const perfectBoostPadResult = resolveBoostPadForFrame({
    controlsThrottle: 0.1,
    distance: 5,
    dt: 0.1,
    speed: 20,
    zipper: perfectBoostPad,
  });
  const slowBoostPad = { cooldown: 0 };
  const slowBoostPadResult = resolveBoostPadForFrame({
    controlsThrottle: 0.1,
    distance: 5,
    dt: 0.1,
    speed: 5.5,
    zipper: slowBoostPad,
  });
  if (
    coolingBoostPadResult.activated ||
    Math.abs(coolingBoostPad.cooldown - 0.05) > 0.001 ||
    !standardBoostPadResult.activated ||
    standardBoostPadResult.perfect ||
    standardBoostPadResult.boost.seconds !== 0.82 ||
    standardBoostPadResult.boost.impulse !== 14 ||
    standardBoostPadResult.boost.tier !== 2 ||
    standardBoostPadResult.boost.source !== 'pad' ||
    standardBoostPadResult.perfectBoostTimer !== 0 ||
    standardBoostPad.cooldown !== 1.2 ||
    !perfectBoostPadResult.activated ||
    !perfectBoostPadResult.perfect ||
    perfectBoostPadResult.boost.seconds !== 1.36 ||
    perfectBoostPadResult.boost.impulse !== 22 ||
    perfectBoostPadResult.boost.tier !== 3 ||
    perfectBoostPadResult.perfectBoostTimer !== 1.1 ||
    perfectBoostPad.cooldown !== 1.2 ||
    slowBoostPadResult.activated ||
    slowBoostPad.cooldown !== 0
  ) {
    fail('Boost pad helper should preserve cooldown decay, activation gate, perfect boost, and boost payload values', {
      coolingBoostPad,
      coolingBoostPadResult,
      perfectBoostPad,
      perfectBoostPadResult,
      slowBoostPad,
      slowBoostPadResult,
      standardBoostPad,
      standardBoostPadResult,
    });
  }

  const coolingFlightGate = { altitude: 20, cooldown: 0.2 };
  const coolingFlightGateResult = resolveFlightGateForFrame({
    distance: 4,
    dt: 0.05,
    gate: coolingFlightGate,
    isPlane: true,
    playerAltitude: 20,
    roadWidth: 40,
  });
  const activeFlightGate = { altitude: 20, cooldown: 0 };
  const activeFlightGateResult = resolveFlightGateForFrame({
    distance: 9,
    dt: 0.1,
    gate: activeFlightGate,
    isPlane: true,
    playerAltitude: 24,
    roadWidth: 40,
  });
  const notPlaneFlightGate = { altitude: 20, cooldown: 0 };
  const notPlaneFlightGateResult = resolveFlightGateForFrame({
    distance: 4,
    dt: 0.1,
    gate: notPlaneFlightGate,
    isPlane: false,
    playerAltitude: 20,
    roadWidth: 40,
  });
  const altitudeMissFlightGate = { altitude: 20, cooldown: 0 };
  const altitudeMissFlightGateResult = resolveFlightGateForFrame({
    distance: 4,
    dt: 0.1,
    gate: altitudeMissFlightGate,
    isPlane: true,
    playerAltitude: 27,
    roadWidth: 12,
  });
  if (
    coolingFlightGateResult.activated ||
    Math.abs(coolingFlightGate.cooldown - 0.15) > 0.001 ||
    !activeFlightGateResult.activated ||
    activeFlightGateResult.boost.seconds !== 0.5 ||
    activeFlightGateResult.boost.impulse !== 8.5 ||
    activeFlightGateResult.boost.tier !== 1 ||
    activeFlightGateResult.boost.source !== 'pad' ||
    activeFlightGate.cooldown !== 1.75 ||
    notPlaneFlightGateResult.activated ||
    notPlaneFlightGateResult.reason !== 'not-plane' ||
    altitudeMissFlightGateResult.activated ||
    altitudeMissFlightGateResult.reason !== 'altitude'
  ) {
    fail('Flight gate helper should preserve plane, cooldown, distance, altitude, and boost payload gates', {
      activeFlightGate,
      activeFlightGateResult,
      altitudeMissFlightGate,
      altitudeMissFlightGateResult,
      coolingFlightGate,
      coolingFlightGateResult,
      notPlaneFlightGate,
      notPlaneFlightGateResult,
    });
  }

  const collisionRacer = {
    ghostTimer: 0,
    invincibleTimer: 0,
    position: new THREE.Vector3(4.5, 0, 0),
    vehicleMode: 'kart',
    velocity: new THREE.Vector3(-kart.maxSpeed * 0.22, 0, kart.maxSpeed * 0.6),
  };
  const collision = resolveWorldCircleCollision({
    circle: { position: new THREE.Vector3(0, 0, 0), radius: 8 },
    circleRoad: { distance: 18, roadWidth: 8 },
    racer: collisionRacer,
  });
  if (
    !collision.collided ||
    Math.abs(collision.effectiveRadius - 8) > 0.001 ||
    Math.abs(collision.radius - 11.2) > 0.001 ||
    Math.abs(collisionRacer.position.x - 11.2) > 0.001 ||
    collision.speedLossRatio < 0.25 ||
    collision.speedLossRatio > 0.45
  ) {
    fail('World circle collision helper should preserve bounce, push-out, and PRD speed-loss band', {
      collision,
      position: collisionRacer.position,
      velocity: collisionRacer.velocity,
    });
  }
  const planeCollision = resolveWorldCircleCollision({
    circle: { position: new THREE.Vector3(0, 0, 0), radius: 8 },
    circleRoad: { distance: 18, roadWidth: 8 },
    racer: {
      ghostTimer: 0,
      invincibleTimer: 0,
      position: new THREE.Vector3(4.5, 0, 0),
      vehicleMode: 'plane',
      velocity: new THREE.Vector3(-20, 0, 12),
    },
  });
  if (planeCollision.collided) fail('Plane mode should ignore ground world circle collisions', { planeCollision });

  const collisionFrameRacer = {
    ghostTimer: 0,
    invincibleTimer: 0,
    position: new THREE.Vector3(4.5, 0, 0),
    vehicleMode: 'kart',
    velocity: new THREE.Vector3(-kart.maxSpeed * 0.22, 0, kart.maxSpeed * 0.6),
  };
  const collisionFrameNearestCalls = [];
  const collisionFrame = resolveWorldCollisionContactsForFrame({
    collisionCircles: [
      { key: 'hit', position: new THREE.Vector3(0, 0, 0), radius: 8 },
      { key: 'miss', position: new THREE.Vector3(30, 0, 0), radius: 3 },
    ],
    defaultRoadWidth: 8,
    nearestRoadForPosition: (position) => {
      collisionFrameNearestCalls.push(position);
      return { distance: 18 };
    },
    racer: collisionFrameRacer,
  });
  const ghostCollisionFrame = resolveWorldCollisionContactsForFrame({
    collisionCircles: [{ key: 'ghost-hit', position: new THREE.Vector3(0, 0, 0), radius: 8 }],
    defaultRoadWidth: 8,
    nearestRoadForPosition: (position) => {
      collisionFrameNearestCalls.push(position);
      return { distance: 18 };
    },
    racer: {
      ghostTimer: 1,
      invincibleTimer: 0,
      position: new THREE.Vector3(4.5, 0, 0),
      vehicleMode: 'kart',
      velocity: new THREE.Vector3(-20, 0, 12),
    },
  });
  if (
    !collisionFrame.collided ||
    collisionFrame.contacts.length !== 1 ||
    collisionFrame.contacts[0].circle.key !== 'hit' ||
    Math.abs(collisionFrame.contacts[0].collision.effectiveRadius - 8) > 0.001 ||
    Math.abs(collisionFrameRacer.position.x - 11.2) > 0.001 ||
    collisionFrameNearestCalls.length !== 2 ||
    ghostCollisionFrame.collided ||
    ghostCollisionFrame.contacts.length !== 0 ||
    collisionFrameNearestCalls.length !== 2
  ) {
    fail('World collision frame helper should preserve eligibility, nearest-road lookup, default road width, and contact payloads', {
      collisionFrame,
      collisionFrameNearestCalls: collisionFrameNearestCalls.length,
      collisionFramePosition: collisionFrameRacer.position,
      ghostCollisionFrame,
    });
  }

  const rivalBumpCalls = [];
  const rivalBumpPlayer = {
    hitTimer: 0,
    jumpHeight: 0,
    position: new THREE.Vector3(4, 0, 0),
    shieldTimer: 0,
  };
  const rivalBumpFrame = resolvePlayerRivalBumpsForFrame({
    hitPlayer: (severity) => {
      rivalBumpCalls.push({ severity, type: 'hit-player' });
      rivalBumpPlayer.hitTimer = 0.5;
    },
    hitRival: (rival, severity) => rivalBumpCalls.push({ rival, severity, type: 'hit-rival' }),
    isPlane: false,
    player: rivalBumpPlayer,
    rivals: [
      { key: 'near', position: new THREE.Vector3(0, 0, 0) },
      { key: 'skipped-after-hit', position: new THREE.Vector3(4.5, 0, 0) },
    ],
  });
  const shieldBumpCalls = [];
  const shieldBumpRival = { key: 'shield-target', position: new THREE.Vector3(0, 0, 0) };
  const shieldBumpPlayer = {
    hitTimer: 0,
    jumpHeight: 0,
    position: new THREE.Vector3(4, 0, 0),
    shieldTimer: 1,
  };
  const shieldBumpFrame = resolvePlayerRivalBumpsForFrame({
    hitPlayer: (severity) => shieldBumpCalls.push({ severity, type: 'hit-player' }),
    hitRival: (rival, severity) => shieldBumpCalls.push({ rival, severity, type: 'hit-rival' }),
    isPlane: false,
    player: shieldBumpPlayer,
    rivals: [shieldBumpRival],
  });
  const planeBumpFrame = resolvePlayerRivalBumpsForFrame({
    isPlane: true,
    player: {
      hitTimer: 0,
      jumpHeight: 0,
      position: new THREE.Vector3(4, 0, 0),
      shieldTimer: 0,
    },
    rivals: [{ key: 'plane-skip', position: new THREE.Vector3(0, 0, 0) }],
  });
  if (
    !rivalBumpFrame.bumped ||
    rivalBumpFrame.contacts.length !== 1 ||
    rivalBumpFrame.contacts[0].rival.key !== 'near' ||
    Math.abs(rivalBumpFrame.contacts[0].pushDistance - 0.81) > 0.001 ||
    Math.abs(rivalBumpPlayer.position.x - 4.81) > 0.001 ||
    rivalBumpCalls.length !== 1 ||
    rivalBumpCalls[0].type !== 'hit-player' ||
    Math.abs(rivalBumpCalls[0].severity - 0.34) > 0.001 ||
    !shieldBumpFrame.bumped ||
    shieldBumpFrame.contacts.length !== 1 ||
    !shieldBumpFrame.contacts[0].shielded ||
    Math.abs(shieldBumpPlayer.position.x - 4.81) > 0.001 ||
    shieldBumpCalls.length !== 1 ||
    shieldBumpCalls[0].type !== 'hit-rival' ||
    shieldBumpCalls[0].rival !== shieldBumpRival ||
    Math.abs(shieldBumpCalls[0].severity - 0.75) > 0.001 ||
    planeBumpFrame.bumped ||
    planeBumpFrame.reason !== 'plane'
  ) {
    fail('Player/rival bump helper should preserve push distance, shield redirect, hit callbacks, hit-timer gating, and plane skip behavior', {
      planeBumpFrame,
      rivalBumpCalls,
      rivalBumpFrame,
      rivalBumpPosition: rivalBumpPlayer.position,
      shieldBumpCalls,
      shieldBumpFrame,
      shieldBumpPosition: shieldBumpPlayer.position,
    });
  }

  const preTrigger = updateStuckRecoveryState({
    dt: 1.2,
    grounded: true,
    isPlane: false,
    movementDistance: STUCK_RECOVERY_TUNING.movementThreshold * 0.5,
    speed: STUCK_RECOVERY_TUNING.speedThreshold * 0.5,
    stuckTimer: 0,
    throttle: 1,
  });
  if (preTrigger.recover || preTrigger.stuckTimer < 1.19 || preTrigger.stuckTimer > 1.21) {
    fail('Stuck recovery should wait for the PRD duration threshold before recovering', { preTrigger });
  }

  const trigger = updateStuckRecoveryState({
    dt: 0.08,
    grounded: true,
    isPlane: false,
    movementDistance: STUCK_RECOVERY_TUNING.movementThreshold * 0.5,
    speed: STUCK_RECOVERY_TUNING.speedThreshold * 0.5,
    stuckTimer: preTrigger.stuckTimer,
    throttle: 1,
  });
  if (!trigger.recover || trigger.stuckTimer !== 0 || trigger.recoveryCooldown <= 0) {
    fail('Stuck recovery should trigger after throttle-held low-speed delay', { trigger });
  }

  const moving = updateStuckRecoveryState({
    dt: 1.4,
    grounded: true,
    isPlane: false,
    movementDistance: STUCK_RECOVERY_TUNING.movementThreshold + 0.1,
    speed: STUCK_RECOVERY_TUNING.speedThreshold * 0.5,
    stuckTimer: 0,
    throttle: 1,
  });
  if (moving.recover || moving.stuckTimer !== 0) {
    fail('Stuck recovery should not trigger while the kart is still making position progress', { moving });
  }

  const plane = updateStuckRecoveryState({
    dt: 1.4,
    grounded: true,
    isPlane: true,
    movementDistance: 0,
    speed: 0,
    stuckTimer: 0,
    throttle: 1,
  });
  if (plane.recover || plane.stuckTimer !== 0) {
    fail('Stuck recovery should not run for plane mode', { plane });
  }

  const stuckPlayer = {
    heading: Math.PI,
    velocity: new THREE.Vector3(0, 0, 0),
  };
  const recovery = applyStuckRecovery({
    activeRoadWidth: 44,
    nearest: {
      distance: 18,
      normal: new THREE.Vector3(1, 0, 0),
      tangent: new THREE.Vector3(0, 0, 1),
    },
    player: stuckPlayer,
    vehicle: VEHICLES.kart,
  });
  if (!recovery || Math.abs(stuckPlayer.heading) >= Math.PI || stuckPlayer.velocity.length() < 8) {
    fail('Stuck recovery should rotate toward the route and apply a forward push', {
      recovery,
      heading: stuckPlayer.heading,
      speed: stuckPlayer.velocity.length(),
    });
  }
};

const validateRaceProgressHelpers = () => {
  const lapRacer = {
    bestLap: 14,
    finished: false,
    lap: 1,
    lapSplits: [],
    lapStartTime: 2,
    progress: 0.9,
  };
  const lapProgress = applyLapProgress({
    progress: 0.05,
    racer: lapRacer,
    raceTime: 12,
    totalLaps: 3,
    trackLapSplits: true,
  });
  if (
    !lapProgress.completedLap ||
    lapProgress.finished ||
    lapRacer.lap !== 2 ||
    lapRacer.lapStartTime !== 12 ||
    lapRacer.bestLap !== 10 ||
    lapRacer.lapSplits[0] !== 10
  ) {
    fail('Lap progress helper should preserve lap crossing, split, and best-lap updates', {
      lapProgress,
      lapRacer,
    });
  }

  const reverseWrapRacer = { finished: false, lap: 1, progress: 0.08 };
  const reverseWrap = applyLapProgress({
    progress: 0.93,
    racer: reverseWrapRacer,
    raceTime: 4,
    totalLaps: 3,
  });
  if (!reverseWrap.reverted || reverseWrapRacer.progress !== 0.08 || reverseWrapRacer.lap !== 1) {
    fail('Lap progress helper should preserve anti-reverse wrap protection', {
      reverseWrap,
      reverseWrapRacer,
    });
  }

  const finishRacer = { finished: false, lap: 3, lapStartTime: 30, progress: 0.91 };
  const finishProgress = applyLapProgress({
    progress: 0.04,
    racer: finishRacer,
    raceTime: 44,
    totalLaps: 3,
  });
  if (!finishProgress.completedLap || !finishProgress.finished || finishRacer.finishTime !== 44) {
    fail('Lap progress helper should mark racers finished after the configured final lap', {
      finishProgress,
      finishRacer,
    });
  }

  if (scoreRacer({ finished: true, lap: 1, progress: 0.2 }) !== 20.2) {
    fail('Race score helper should preserve the finished-racer bonus sort order');
  }

  const rankingPlayer = { finished: false, lap: 1, progress: 0.4, rank: 1 };
  const rankingRivals = [
    { finished: false, lap: 1, progress: 0.5 },
    { finished: false, lap: 1, progress: 0.1 },
  ];
  const rankingLoss = applyRaceRankings({
    lastPlayerRank: 1,
    player: rankingPlayer,
    rivals: rankingRivals,
  });
  rankingPlayer.progress = 0.7;
  const rankingGain = applyRaceRankings({
    lastPlayerRank: rankingLoss.lastPlayerRank,
    player: rankingPlayer,
    rivals: rankingRivals,
  });
  if (
    rankingLoss.playerRank !== 2 ||
    rankingLoss.positionNotice?.text !== 'Position -1' ||
    rankingGain.playerRank !== 1 ||
    rankingGain.positionNotice?.text !== 'Position +1'
  ) {
    fail('Race ranking helper should preserve rank sorting and position notices', {
      rankingGain,
      rankingLoss,
      rankingPlayer,
      rankingRivals,
    });
  }
};

const validateChaseCameraHelpers = () => {
  const mobilePreset = { distance: 38, fov: 66, height: 9.8, lookAhead: 52 };
  const desktopKart = resolveChaseCameraProfile({
    altitude: 0,
    boostActive: false,
    isPlane: false,
    mobile: false,
    mobilePreset,
    speed: 48,
    vehicle: VEHICLES.kart,
  });
  if (Math.abs(desktopKart.speedRatio - 0.667) > 0.002) {
    fail('Desktop kart camera speed ratio changed unexpectedly', { desktopKart });
  }
  if (Math.abs(desktopKart.chaseDistance - 37) > 0.05) {
    fail('Desktop kart camera distance changed unexpectedly', { desktopKart });
  }
  if (desktopKart.lookAhead < 49.9 || desktopKart.lookAhead > 50.1 || desktopKart.chaseHeight < 8.3 || desktopKart.chaseHeight > 8.4) {
    fail('Desktop kart camera lookahead changed unexpectedly', { desktopKart });
  }

  const mobileKart = resolveChaseCameraProfile({
    boostActive: true,
    isPlane: false,
    mobile: true,
    mobilePreset,
    speed: 48,
    vehicle: VEHICLES.kart,
  });
  if (mobileKart.fov !== 66 || mobileKart.chaseDistance < 38.7 || mobileKart.chaseDistance > 38.9) {
    fail('Mobile boosted kart camera profile changed unexpectedly', { mobileKart });
  }
  const reducedBoostKart = resolveChaseCameraProfile({
    boostActive: true,
    isPlane: false,
    mobile: false,
    mobilePreset,
    reducedMotion: true,
    speed: 48,
    vehicle: VEHICLES.kart,
  });
  if (reducedBoostKart.fov !== 62) {
    fail('Reduced-motion camera profile should suppress boost FOV pulse', { reducedBoostKart });
  }

  const plane = resolveChaseCameraProfile({
    altitude: 17,
    boostActive: false,
    isPlane: true,
    mobile: false,
    mobilePreset,
    speed: 31,
    vehicle: VEHICLES.plane,
  });
  if (plane.chaseHeight < 29.2 || plane.chaseHeight > 29.3 || plane.sideOffsetScale !== 3.6) {
    fail('Plane chase camera profile changed unexpectedly', { plane });
  }

  const driftRoll = cameraRollFor({ driftActive: true, speedRatio: 0.75, steerInput: 0.6 });
  const normalRoll = cameraRollFor({ driftActive: false, speedRatio: 0.75, steerInput: 0.6 });
  const reducedRoll = cameraRollFor({
    driftActive: true,
    reducedMotion: true,
    speedRatio: 0.75,
    steerInput: 0.6,
  });
  if (Math.abs(driftRoll) <= Math.abs(normalRoll)) {
    fail('Drift camera roll should be stronger than normal steering roll', { driftRoll, normalRoll });
  }
  if (reducedRoll !== 0) {
    fail('Reduced-motion camera roll should be disabled', { reducedRoll });
  }

  const routeLookahead = resolveRouteLookaheadTarget({
    compiled: {
      pointAt: (progress) => ({
        point: new THREE.Vector3(progress * 100, 0, 20),
        tangent: new THREE.Vector3(1, 0, 0),
      }),
      totalLength: 100,
    },
    fallbackForward: new THREE.Vector3(0, 0, 1),
    player: {
      position: new THREE.Vector3(0, 0, 0),
      progress: 0.1,
    },
    profile: { lookAhead: 20 },
    speed: 20,
  });
  if (
    !routeLookahead.usedRoute ||
    routeLookahead.seconds !== 1.25 ||
    routeLookahead.target.x < 34.9 ||
    Math.abs(routeLookahead.curvature) < 1.5
  ) {
    fail('Route lookahead should sample ahead by PRD midpoint seconds and expose turn curvature', { routeLookahead });
  }

  const fallbackLookahead = resolveRouteLookaheadTarget({
    compiled: null,
    fallbackForward: new THREE.Vector3(0, 0, 1),
    player: {
      position: new THREE.Vector3(0, 0, 0),
      progress: 0.1,
    },
    profile: { lookAhead: 20 },
    speed: 20,
  });
  if (fallbackLookahead.usedRoute || fallbackLookahead.target.z !== 20) {
    fail('Route lookahead should preserve heading fallback when route data is unavailable', { fallbackLookahead });
  }

  const rayStart = new THREE.Vector3(0, 4, 0);
  const noHitDesired = new THREE.Vector3(0, 9, -24);
  const noHit = applyCameraCollisionAvoidance({
    collisionLift: 8.4,
    collisionObjects: [{}],
    desired: noHitDesired,
    raycaster: {
      set: () => {},
      intersectObjects: () => [],
    },
    rayStart,
  });
  if (noHit.avoided || noHit.clipped || noHitDesired.distanceTo(new THREE.Vector3(0, 9, -24)) > 0.001) {
    fail('Camera collision helper should leave clear camera paths unchanged', { noHit });
  }

  const nearCameraCollider = {
    userData: {
      raceCameraCollider: {
        center: new THREE.Vector3(0, 6, -12),
        radius: 2,
      },
    },
  };
  const farCameraCollider = {
    userData: {
      raceCameraCollider: {
        center: new THREE.Vector3(80, 6, -12),
        radius: 2,
      },
    },
  };
  const unboundedCameraCollider = { userData: {} };
  const cameraCollisionCandidates = cameraCollisionCandidatesFor({
    collisionObjects: [nearCameraCollider, farCameraCollider, unboundedCameraCollider],
    distance: 24,
    rayDirection: new THREE.Vector3(0, 0, -1),
    rayStart,
  });
  let filteredCameraRaycastCount = 0;
  const filteredCameraCollision = applyCameraCollisionAvoidance({
    collisionLift: 8.4,
    collisionObjects: [farCameraCollider],
    desired: new THREE.Vector3(0, 9, -24),
    raycaster: {
      set: () => {
        filteredCameraRaycastCount += 1;
      },
      intersectObjects: () => [{ distance: 12 }],
    },
    rayStart,
  });
  if (
    cameraCollisionCandidates.length !== 2 ||
    !cameraCollisionCandidates.includes(nearCameraCollider) ||
    cameraCollisionCandidates.includes(farCameraCollider) ||
    !cameraCollisionCandidates.includes(unboundedCameraCollider) ||
    filteredCameraCollision.avoided ||
    filteredCameraRaycastCount !== 0
  ) {
    fail('Camera collision broad phase should keep near and unbounded colliders while skipping distant bounded colliders', {
      cameraCollisionCandidates,
      filteredCameraCollision,
      filteredCameraRaycastCount,
    });
  }

  let raycastCount = 0;
  const blockedDesired = new THREE.Vector3(0, 9, -24);
  const blocked = applyCameraCollisionAvoidance({
    collisionLift: 8.4,
    collisionObjects: [{}],
    desired: blockedDesired,
    raycaster: {
      set: () => {
        raycastCount += 1;
      },
      intersectObjects: () => (raycastCount === 1 ? [{ distance: 12 }] : []),
    },
    rayStart,
  });
  if (!blocked.avoided || blocked.clipped || blockedDesired.y < 12.39 || blockedDesired.distanceTo(rayStart) >= 24) {
    fail('Camera collision helper should lift and pull in blocked camera paths', { blocked, blockedDesired });
  }

  let iterativeRaycastCount = 0;
  const iterativeDesired = new THREE.Vector3(0, 9, -24);
  const iterativeResolution = applyCameraCollisionAvoidance({
    collisionLift: 8.4,
    collisionObjects: [{}],
    desired: iterativeDesired,
    raycaster: {
      set: () => {
        iterativeRaycastCount += 1;
      },
      intersectObjects: () => (iterativeRaycastCount <= 2 ? [{ distance: 12 }] : []),
    },
    rayStart,
  });
  if (!iterativeResolution.avoided || iterativeResolution.clipped || iterativeRaycastCount < 3 || iterativeDesired.y < 14) {
    fail('Camera collision helper should retry pull/lift resolution before reporting an unresolved clip', {
      iterativeDesired,
      iterativeRaycastCount,
      iterativeResolution,
    });
  }

  const frameCamera = new THREE.PerspectiveCamera(66, 1, 0.25, 620);
  const framePlayer = {
    boostTimer: 0,
    driftActive: true,
    flightAltitude: 0,
    heading: 0,
    jumpHeight: 0,
    position: new THREE.Vector3(0, 0, 0),
    progress: 0.1,
    steerInput: 0.5,
    vehicleMode: 'kart',
    velocity: new THREE.Vector3(0, 0, 48),
  };
  const frameRoute = {
    pointAt: (progress) => ({
      point: new THREE.Vector3(progress * 1000, 0, 20),
      tangent: new THREE.Vector3(1, 0, 0),
    }),
    totalLength: 1000,
  };
  const cameraFrame = updateChaseCameraFrame({
    camera: frameCamera,
    cameraInitialized: false,
    compiled: frameRoute,
    dt: 0.1,
    mobile: false,
    mobilePreset,
    player: framePlayer,
    race: { cameraShakeTimer: 0 },
    vehicle: VEHICLES.kart,
  });
  if (
    !cameraFrame.cameraInitialized ||
    !cameraFrame.routeLookahead?.usedRoute ||
    cameraFrame.routeLookahead.seconds !== 1.25 ||
    Math.abs(frameCamera.position.x + 0.45) > 0.01 ||
    Math.abs(frameCamera.position.y - 8.333) > 0.01 ||
    Math.abs(frameCamera.position.z + 51) > 0.01 ||
    Math.abs(frameCamera.fov - 64.847) > 0.01 ||
    Math.abs(frameCamera.rotation.z) < 0.01
  ) {
    fail('Camera frame helper should preserve initial chase placement, route lookahead, FOV, and drift roll', {
      cameraFrame,
      cameraPosition: frameCamera.position,
      cameraRotation: frameCamera.rotation,
      fov: frameCamera.fov,
    });
  }

  const reducedMotionFrameCamera = new THREE.PerspectiveCamera(66, 1, 0.25, 620);
  const reducedMotionFrame = updateChaseCameraFrame({
    camera: reducedMotionFrameCamera,
    cameraInitialized: false,
    compiled: frameRoute,
    dt: 0.1,
    mobile: false,
    mobilePreset,
    player: {
      ...framePlayer,
      boostTimer: 1,
    },
    race: { cameraShakeTimer: 0.2 },
    random: () => {
      fail('Reduced-motion camera frame should not sample camera shake randomness');
      return 0.5;
    },
    reducedMotion: true,
    vehicle: VEHICLES.kart,
  });
  if (
    !reducedMotionFrame.cameraInitialized ||
    Math.abs(reducedMotionFrameCamera.fov - 64.847) > 0.01
  ) {
    fail('Reduced-motion camera frame should suppress shake and boost FOV pulse', {
      cameraRotation: reducedMotionFrameCamera.rotation,
      fov: reducedMotionFrameCamera.fov,
      reducedMotionFrame,
    });
  }

  const collisionFrameCamera = new THREE.PerspectiveCamera(66, 1, 0.25, 620);
  const cameraFrameStats = { cameraAvoidanceCount: 0, cameraClipCount: 0 };
  let frameRaycastCount = 0;
  const collisionCameraFrame = updateChaseCameraFrame({
    camera: collisionFrameCamera,
    cameraCollisionObjects: [{}],
    cameraInitialized: false,
    collisionStats: cameraFrameStats,
    compiled: frameRoute,
    dt: 0.1,
    mobile: false,
    mobilePreset,
    player: framePlayer,
    race: { cameraShakeTimer: 0 },
    raycaster: {
      set: () => {
        frameRaycastCount += 1;
      },
      intersectObjects: () => (frameRaycastCount === 1 ? [{ distance: 12 }] : []),
    },
    vehicle: VEHICLES.kart,
  });
  if (
    !collisionCameraFrame.cameraInitialized ||
    cameraFrameStats.cameraAvoidanceCount !== 1 ||
    cameraFrameStats.cameraClipCount !== 0 ||
    collisionFrameCamera.position.distanceTo(framePlayer.position) >= frameCamera.position.distanceTo(framePlayer.position)
  ) {
    fail('Camera frame helper should preserve collision avoidance counter updates and safe camera pull-in', {
      cameraFrameStats,
      collisionCameraFrame,
      collisionPosition: collisionFrameCamera.position,
      frameRaycastCount,
    });
  }

  const headingCameraFrame = updateChaseCameraFrame({
    camera: new THREE.PerspectiveCamera(66, 1, 0.25, 620),
    cameraInitialized: false,
    compiled: frameRoute,
    mobilePreset,
    player: framePlayer,
    race: { cameraShakeTimer: 0 },
    useHeadingCamera: true,
    vehicle: VEHICLES.kart,
  });
  if (headingCameraFrame.routeLookahead !== null) {
    fail('Camera frame helper should skip route lookahead for heading-camera visual scenarios', { headingCameraFrame });
  }

  const projectionCamera = new THREE.PerspectiveCamera(66, 1, 0.25, 620);
  const originalProjectionUpdate = projectionCamera.updateProjectionMatrix.bind(projectionCamera);
  let projectionUpdateCount = 0;
  projectionCamera.updateProjectionMatrix = () => {
    projectionUpdateCount += 1;
    originalProjectionUpdate();
  };
  updateChaseCameraFrame({
    camera: projectionCamera,
    cameraInitialized: false,
    compiled: frameRoute,
    dt: 0.1,
    mobile: false,
    mobilePreset,
    player: framePlayer,
    race: { cameraShakeTimer: 0 },
    vehicle: VEHICLES.kart,
  });
  updateChaseCameraFrame({
    camera: projectionCamera,
    cameraInitialized: true,
    compiled: frameRoute,
    dt: 0.1,
    mobile: false,
    mobilePreset,
    player: {
      ...framePlayer,
      boostTimer: 1,
    },
    race: { cameraShakeTimer: 0 },
    vehicle: VEHICLES.kart,
  });
  if (projectionUpdateCount !== 2 || Math.abs(projectionCamera.fov - 64.603) > 0.01) {
    fail('Camera frame helper should skip stable projection updates and update projection when FOV changes', {
      fov: projectionCamera.fov,
      projectionUpdateCount,
    });
  }
};

const validateRaceAudioHelpers = () => {
  if (cueFrequencyFor('boost-pad') !== 720 || cueFrequencyFor('lightning-hit') !== 180) {
    fail('Race audio cue frequency mapping changed unexpectedly');
  }
  if (cueFrequencyFor('anchorDrop') !== 120 || cueFrequencyFor('shield') !== 520 || cueFrequencyFor('surge-on') !== 520) {
    fail('Race audio item cue frequency mapping changed unexpectedly');
  }
  if (cueWaveTypeFor('item-hit') !== 'square' || cueWaveTypeFor('boost') !== 'triangle') {
    fail('Race audio wave type mapping changed unexpectedly');
  }
  const stormVoices = ambientVoicesFor('static-storm-plateau');
  const mineVoices = ambientVoicesFor('magnet-mine-descent');
  const cityVoices = ambientVoicesFor('comeback-city');
  if (stormVoices.length !== 3 || stormVoices[0].frequency !== 54 || stormVoices[1].type !== 'square') {
    fail('Static storm ambient voices changed unexpectedly', { stormVoices });
  }
  if (mineVoices.length !== 3 || mineVoices[0].frequency !== 42 || mineVoices[0].type !== 'square') {
    fail('Magnet mine ambient voices changed unexpectedly', { mineVoices });
  }
  if (cityVoices.length !== 3 || cityVoices[0].frequency !== 72 || cityVoices[2].gain !== 0.0018) {
    fail('Default city ambient voices changed unexpectedly', { cityVoices });
  }

  const createdOscillators = [];
  const createdGains = [];
  let audioContextCount = 0;
  class FakeOscillator {
    constructor() {
      this.frequency = {
        setValueAtTime: (value) => {
          this.frequency.value = value;
        },
        value: 0,
      };
      this.started = false;
      this.stopped = false;
      this.type = 'sine';
      createdOscillators.push(this);
    }

    connect(target) {
      this.connected = target;
      return target;
    }

    start() {
      this.started = true;
    }

    stop() {
      this.stopped = true;
    }
  }
  class FakeGain {
    constructor() {
      this.gain = {
        exponentialRampToValueAtTime: (value) => {
          this.gain.value = value;
        },
        setValueAtTime: (value) => {
          this.gain.value = value;
        },
        value: 0,
      };
      createdGains.push(this);
    }

    connect(target) {
      this.connected = target;
      return target;
    }
  }
  class FakeAudioContext {
    constructor() {
      audioContextCount += 1;
      this.currentTime = 4;
      this.destination = { tag: 'destination' };
      this.state = 'running';
    }

    createGain() {
      return new FakeGain();
    }

    createOscillator() {
      return new FakeOscillator();
    }
  }

  const audioController = createRaceAudioController({
    audioWindow: { AudioContext: FakeAudioContext },
    muted: true,
    trackKey: 'comeback-city',
  });
  audioController.playCue('boost-pad');
  const mutedCueContextCount = audioContextCount;
  const unmuted = audioController.setMuted(false);
  audioController.playCue('boost-pad');
  const unmutedOscillatorCount = createdOscillators.length;
  const unmutedAmbientGain = createdGains[0]?.gain.value;
  const remuted = audioController.setMuted(true);
  const mutedAmbientGain = createdGains[0]?.gain.value;
  audioController.playCue('boost-pad');
  const remutedOscillatorCount = createdOscillators.length;
  audioController.dispose();

  if (
    mutedCueContextCount !== 0 ||
    unmuted !== false ||
    remuted !== true ||
    audioController.isMuted() !== true ||
    audioContextCount !== 1 ||
    unmutedOscillatorCount !== 4 ||
    remutedOscillatorCount !== unmutedOscillatorCount ||
    Math.abs(unmutedAmbientGain - cityVoices[0].gain) > 0.0001 ||
    mutedAmbientGain !== 0 ||
    !createdOscillators.slice(0, 3).every((oscillator) => oscillator.started && oscillator.stopped)
  ) {
    fail('Race audio controller should gate cue/ambient playback and mute active ambient voices', {
      audioContextCount,
      mutedAmbientGain,
      mutedCueContextCount,
      remuted,
      remutedOscillatorCount,
      unmuted,
      unmutedAmbientGain,
      unmutedOscillatorCount,
    });
  }
};

const validateRaceRivalHelpers = () => {
  const routeLayers = {
    air: { aiWeight: 0.82, key: 'air', vehiclePreference: 'plane' },
    ground: { aiWeight: 1, key: 'ground', vehiclePreference: 'kart' },
    hybrid: { aiWeight: 0.9, key: 'hybrid', vehiclePreference: 'hover' },
  };
  const aiRivals = [{ risk: 0.8 }, { risk: 0.2 }];
  const planeChoice = chooseRaceRivalRouteLayer({
    aiRivals,
    index: 0,
    rival: { vehicleMode: 'plane' },
    routeLayers,
  });
  const kartChoice = chooseRaceRivalRouteLayer({
    aiRivals,
    index: 0,
    rival: { vehicleMode: 'kart' },
    routeLayers,
  });
  const hoverChoice = chooseRaceRivalRouteLayer({
    aiRivals,
    index: 1,
    rival: { heldItem: { itemKey: 'boost' }, vehicleMode: 'hover' },
    routeLayers,
  });
  const fallbackChoice = chooseRaceRivalRouteLayer({
    routeLayers: {},
    rival: { vehicleMode: 'plane' },
  });
  if (planeChoice !== 'air' || kartChoice !== 'ground' || hoverChoice !== 'hybrid' || fallbackChoice !== 'ground') {
    fail('Rival route-layer helper should preserve vehicle score, risk bias, held-item bonus, and empty-route fallback', {
      fallbackChoice,
      hoverChoice,
      kartChoice,
      planeChoice,
    });
  }

  const signatureTriggers = [];
  const signaturePlayer = { position: new THREE.Vector3(0, 0, 0) };
  const dockRival = {
    ai: { signature: 'dock-bell' },
    position: new THREE.Vector3(100, 0, 0),
    progress: 0.35,
    rank: 2,
  };
  const staticRival = {
    ai: { signature: 'static-bait' },
    position: new THREE.Vector3(20, 0, 0),
    progress: 0.43,
    rank: 1,
  };
  const drillRival = {
    ai: { signature: 'early-drill' },
    position: new THREE.Vector3(80, 0, 0),
    progress: 0.29,
    rank: 4,
  };
  const blockedSignature = maybeUseRivalSignature({
    player: signaturePlayer,
    rival: { ai: { signature: 'dock-bell' }, progress: 0.2, rank: 2 },
    triggerHazardByType: (...args) => signatureTriggers.push(args),
  });
  const dockSignature = maybeUseRivalSignature({
    player: signaturePlayer,
    rival: dockRival,
    triggerHazardByType: (...args) => signatureTriggers.push(args),
  });
  const staticSignature = maybeUseRivalSignature({
    player: signaturePlayer,
    rival: staticRival,
    triggerHazardByType: (...args) => signatureTriggers.push(args),
  });
  const drillSignature = maybeUseRivalSignature({
    player: signaturePlayer,
    rival: drillRival,
    triggerHazardByType: (...args) => signatureTriggers.push(args),
  });
  if (
    blockedSignature.used ||
    !dockSignature.used ||
    !staticSignature.used ||
    !drillSignature.used ||
    signatureTriggers.length !== 3 ||
    signatureTriggers[0][0] !== 'seagulls' ||
    signatureTriggers[1][0] !== 'staticCharge' ||
    signatureTriggers[2][0] !== 'mineCart'
  ) {
    fail('Rival signature helper should preserve signature trigger thresholds and one-shot mutation', {
      blockedSignature,
      dockSignature,
      drillSignature,
      signatureTriggers,
      staticSignature,
    });
  }

  const pressureVehicle = { maxSpeed: 72 };
  const catchupPressure = rivalPressureForFrame({
    ai: { aggression: 0.48, patience: 0.62 },
    compiled: { totalLength: 640 },
    dt: 0.1,
    index: 0,
    player: {
      progress: 0.62,
      velocity: new THREE.Vector3(0, 0, 48),
    },
    rival: { progress: 0.34 },
    rivalVehicle: pressureVehicle,
    scoreGap: 0.28,
  });
  const launchPressure = rivalPressureForFrame({
    ai: { aggression: 0.3, patience: 0.74 },
    compiled: { totalLength: 640 },
    dt: 0.1,
    index: 1,
    player: {
      progress: 0.02,
      velocity: new THREE.Vector3(0, 0, 18),
    },
    rival: { progress: 0.08 },
    rivalVehicle: pressureVehicle,
    scoreGap: -0.06,
  });
  const autoplayPressure = rivalPressureForFrame({
    ai: { aggression: 0.36, patience: 0.72 },
    compiled: { totalLength: 640 },
    dt: 0.16,
    index: 2,
    playtest: { enabled: true, mode: 'free-switch' },
    player: {
      progress: 0.52,
      velocity: new THREE.Vector3(0, 0, 48),
    },
    rival: { progress: 0.1 },
    rivalVehicle: pressureVehicle,
    scoreGap: 0.42,
  });
  if (
    catchupPressure.desiredSpeed < pressureVehicle.maxSpeed * 1.08 ||
    launchPressure.desiredSpeed > 32 ||
    !autoplayPressure.progressCorrection ||
    autoplayPressure.progressCorrection.targetProgress < 0.56 ||
    autoplayPressure.desiredSpeed < 640 * 0.94
  ) {
    fail('Rival pressure helper should tighten normal-play packs and pace scripted autoplay without changing visual clusters', {
      autoplayPressure,
      catchupPressure,
      launchPressure,
    });
  }

  const compiled = {
    aiRivals,
    laps: 3,
    pointAt: (progress) => {
      const wrapped = ((progress % 1) + 1) % 1;
      return {
        point: new THREE.Vector3(wrapped * 100, 0, wrapped * 10),
        progress: wrapped,
        tangent: new THREE.Vector3(0, 0, 1),
      };
    },
    roadWidth: 100,
    routeLayers,
    totalLength: 100,
  };
  const race = {
    player: {
      position: new THREE.Vector3(0, 0, 0),
      progress: 0.5,
    },
    rivals: [
      {
        ai: { signature: 'static-bait' },
        finished: false,
        hitTimer: 0,
        invincibleTimer: 0.2,
        lane: 2,
        lap: 1,
        liftDisabledTimer: 0.3,
        polarity: -1,
        polaritySwapTimer: 0.05,
        position: new THREE.Vector3(12, 0, 0),
        progress: 0.43,
        rank: 1,
        speed: 18,
        switchLockedUntil: 0,
        vehicleMode: 'kart',
        wobble: 0,
      },
      {
        finished: false,
        hitTimer: 0.2,
        invincibleTimer: 0,
        lane: -3,
        lap: 3,
        liftDisabledTimer: 0,
        polarity: 1,
        polaritySwapTimer: 0,
        position: new THREE.Vector3(90, 0, 0),
        progress: 0.99,
        rank: 3,
        speed: 50,
        switchLockedUntil: 0,
        vehicleMode: 'plane',
        wobble: 0,
      },
    ],
    time: 12,
  };
  const updateTriggers = [];
  const vehicleSwitches = [];
  const rivalFrame = updateRaceRivalsForFrame({
    compiled,
    defaultVehicle: 'kart',
    dt: 0.1,
    layerOffset: (layer, width) => (layer === 'air' ? width * 0.1 : layer === 'hybrid' ? -width * 0.08 : 0),
    profile: { level: 5 },
    race,
    scoreRacer: (racer) => (racer.lap || 1) - 1 + (racer.progress || 0),
    setVehicleMode: (rival, nextMode, options) => {
      vehicleSwitches.push({ nextMode, options, rival });
      rival.vehicleMode = nextMode;
      return true;
    },
    triggerHazardByType: (...args) => updateTriggers.push(args),
    vehicles: VEHICLES,
  });
  if (
    rivalFrame.mode !== 'standard' ||
    rivalFrame.updatedCount !== 2 ||
    rivalFrame.finishedCount !== 1 ||
    rivalFrame.signatureUses.length !== 1 ||
    updateTriggers[0]?.[0] !== 'staticCharge' ||
    race.rivals[0].invincibleTimer !== 0.1 ||
    Math.abs(race.rivals[0].liftDisabledTimer - 0.2) > 0.001 ||
    race.rivals[0].polarity !== 1 ||
    race.rivals[0].layer !== 'ground' ||
    race.rivals[0].progress <= 0.43 ||
    !race.rivals[1].finished ||
    race.rivals[1].finishTime !== 12 ||
    !vehicleSwitches.length
  ) {
    fail('Rival frame helper should preserve timers, signature use, layer switching, rubberband movement, and finish crossing', {
      race,
      rivalFrame,
      updateTriggers,
      vehicleSwitches,
    });
  }

  const noFinishRace = {
    player: {
      position: new THREE.Vector3(0, 0, 0),
      progress: 0.02,
      velocity: new THREE.Vector3(0, 0, 48),
    },
    rivals: [
      {
        finished: false,
        hitTimer: 0,
        lane: 0,
        lap: 3,
        position: new THREE.Vector3(99, 0, 0),
        progress: 0.99,
        rank: 2,
        speed: 80,
        vehicleMode: 'kart',
        wobble: 0,
      },
    ],
    time: 18,
  };
  const noFinishFrame = updateRaceRivalsForFrame({
    compiled,
    defaultVehicle: 'kart',
    dt: 0.1,
    playtest: { enabled: true, mode: 'free-switch', noFinish: true },
    race: noFinishRace,
    scoreRacer: (racer) => (racer.lap || 1) - 1 + (racer.progress || 0),
    vehicles: VEHICLES,
  });
  if (
    noFinishFrame.finishedCount !== 0 ||
    noFinishRace.rivals[0].finished ||
    noFinishRace.rivals[0].lap !== 1 ||
    noFinishRace.rivals[0].finishTime !== null
  ) {
    fail('Rival frame helper should loop rivals instead of finishing during no-finish scripted captures', {
      noFinishFrame,
      noFinishRace,
    });
  }

  const visualRace = {
    player: { position: compiled.pointAt(0.2).point, progress: 0.2 },
    rivals: [
      { finished: true, position: new THREE.Vector3(), speed: 0 },
      { finished: true, position: new THREE.Vector3(), speed: 0 },
      { finished: true, position: new THREE.Vector3(), speed: 0 },
    ],
  };
  const visualFrame = updateRaceRivalsForFrame({
    compiled,
    playtest: { enabled: true, mode: 'visual-kart', visualScenario: 'rival-cluster' },
    race: visualRace,
    useVisualRivalCluster: (playtest) => visualKartScenarioMatches(playtest, 'rival-cluster'),
  });
  const visualRivalDistances = visualRace.rivals.map((rival) => rival.position.distanceTo(visualRace.player.position));
  if (
    visualFrame.mode !== 'visual-cluster' ||
    visualFrame.updatedCount !== 3 ||
    visualRace.rivals.some((rival) => rival.finished || rival.vehicleMode !== 'kart' || rival.layer !== 'ground' || rival.speed !== 44) ||
    Math.min(...visualRivalDistances) > 16 ||
    Math.max(...visualRivalDistances) > 32
  ) {
    fail('Rival frame helper should preserve visual rival-cluster placement behavior', {
      visualFrame,
      visualRivalDistances,
      visualRace,
    });
  }

  const playtestRuntime = createRacePlaytestRuntime();
  const visualTurnRace = {
    player: { position: compiled.pointAt(0.185).point, progress: 0.185 },
    rivals: [
      { finished: true, position: new THREE.Vector3(), speed: 0 },
      { finished: true, position: new THREE.Vector3(), speed: 0 },
      { finished: true, position: new THREE.Vector3(), speed: 0 },
    ],
  };
  const visualTurnFrame = updateRaceRivalsForFrame({
    compiled,
    playtest: { enabled: true, mode: 'visual-kart', visualScenario: 'turn-approach' },
    race: visualTurnRace,
    useVisualRivalCluster: playtestRuntime.isVisualRivalCluster,
  });
  const visualTurnRivalDistances = visualTurnRace.rivals.map((rival) =>
    rival.position.distanceTo(visualTurnRace.player.position)
  );
  if (
    visualTurnFrame.mode !== 'visual-cluster' ||
    visualTurnFrame.updatedCount !== 3 ||
    visualTurnRace.rivals.some((rival) => rival.finished || rival.vehicleMode !== 'kart' || rival.layer !== 'ground') ||
    Math.min(...visualTurnRivalDistances) > 16 ||
    Math.max(...visualTurnRivalDistances) > 32
  ) {
    fail('Rival frame helper should place a readable rival pack for the required turn-approach drift screenshot', {
      visualTurnFrame,
      visualTurnRace,
      visualTurnRivalDistances,
    });
  }
};

const validateRaceFrameUpdateHelpers = () => {
  const vehicleSwitches = [];
  const vehiclePlayer = {
    position: new THREE.Vector3(0, 0, 0),
    progress: 0.12,
    velocity: new THREE.Vector3(8, 0, 0),
    vehicleMode: 'kart',
  };
  const switchPad = {
    cooldown: 0,
    position: new THREE.Vector3(0, 0, 0),
    radius: 7,
    targetVehicle: 'hover',
  };
  const vehicleFrame = applyRaceVehicleIntegrationForFrame({
    compiled: {
      key: 'unit-track',
      pointAt: () => ({ point: new THREE.Vector3(0, 0, 0) }),
      vehicleLocks: [],
      vehicleZones: [],
    },
    distanceBetween: (a, b) => a.distanceTo(b),
    dt: 0.1,
    hitPlayer: () => {},
    race: {
      player: vehiclePlayer,
      switchPads: [switchPad],
      time: 2,
    },
    setVehicleMode: (racer, nextMode, options) => {
      vehicleSwitches.push({ nextMode, options });
      racer.vehicleMode = nextMode;
      return true;
    },
  });
  const skippedVehicleFrame = applyRaceVehicleIntegrationForFrame({
    compiled: { key: 'comeback-city' },
    playtest: { enabled: false },
    race: { player: vehiclePlayer },
  });
  if (
    vehicleFrame.skipped ||
    vehicleFrame.switchPadHits[0] !== switchPad ||
    vehicleSwitches[0]?.nextMode !== 'hover' ||
    switchPad.cooldown !== 1.2 ||
    !skippedVehicleFrame.skipped
  ) {
    fail('Race frame vehicle integration helper should preserve switch-pad hits and Comeback City non-playtest skip', {
      skippedVehicleFrame,
      switchPad,
      vehicleFrame,
      vehicleSwitches,
    });
  }

  const hazardCalls = [];
  const hazardPlayer = {
    invincibleTimer: 0,
    lightningRodTimer: 2,
    position: new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(12, 0, 0),
    vehicleMode: 'kart',
  };
  const hazardLeader = {
    position: new THREE.Vector3(10, 0, 0),
    progress: 0.8,
    speed: 20,
    vehicleMode: 'kart',
  };
  const hazardRace = {
    player: hazardPlayer,
    rivals: [hazardLeader],
    time: 4,
  };
  const slowEffect = applyRaceTrackHazardEffectForFrame({
    defaultVehicle: 'kart',
    dt: 0.1,
    hazard: { type: 'wet' },
    hitPlayer: (severity) => hazardCalls.push({ severity, type: 'hit-player' }),
    hitRival: (rival, severity) => hazardCalls.push({ rival, severity, type: 'hit-rival' }),
    nextVehicleMode: () => 'hover',
    race: hazardRace,
    racer: hazardPlayer,
    scoreRacer,
    setVehicleMode: () => {},
  });
  const lightningEffect = applyRaceTrackHazardEffectForFrame({
    defaultVehicle: 'kart',
    dt: 0.1,
    hazard: { type: 'lightning' },
    hitRival: (rival, severity) => hazardCalls.push({ rival, severity, type: 'hit-rival' }),
    nextVehicleMode: () => 'hover',
    race: hazardRace,
    racer: hazardPlayer,
    scoreRacer,
    setVehicleMode: () => {},
  });
  if (
    !slowEffect.applied ||
    slowEffect.effect !== 'slow' ||
    !lightningEffect.lightningRedirected ||
    lightningEffect.redirectedTarget !== hazardLeader ||
    hazardPlayer.lightningRodTimer !== 0 ||
    !hazardCalls.some((call) => call.type === 'hit-rival' && call.rival === hazardLeader)
  ) {
    fail('Race frame hazard effect helper should preserve player/rival targeting and lightning-rod redirect behavior', {
      hazardCalls,
      lightningEffect,
      slowEffect,
    });
  }

  const contactRace = {
    player: {
      finished: false,
      position: new THREE.Vector3(0, 0, 0),
      vehicleMode: 'kart',
    },
    rivals: [],
    time: 3,
    trackHazards: [
      {
        cooldown: 0,
        eventPulse: 0.2,
        hitCooldown: 0.5,
        position: new THREE.Vector3(0, 0, 0),
        radius: 6,
        type: 'wet',
      },
    ],
  };
  const contactEffects = [];
  const hazardFrame = updateRaceTrackHazardsForFrame({
    applyHazardEffect: (racer, hazard, dt) => {
      contactEffects.push({ dt, hazard, racer });
      return { applied: true };
    },
    dt: 0.1,
    race: contactRace,
  });
  if (
    hazardFrame.contacts.length !== 1 ||
    hazardFrame.effects.length !== 1 ||
    contactEffects[0]?.hazard !== contactRace.trackHazards[0] ||
    contactRace.trackHazards[0].cooldown !== 0.5
  ) {
    fail('Race frame track-hazard helper should preserve contact resolution and effect dispatch', {
      contactEffects,
      hazardFrame,
    });
  }

  const eventRace = {
    eventCooldowns: {},
    eventFlags: {},
    eventMessages: [],
    player: { lap: 1, progress: 0.5, switchLockedUntil: 0 },
    rivals: [],
    time: 5,
    trackHazards: [{ eventPulse: 0, key: 'gate-a', type: 'gate' }],
  };
  const typeTrigger = triggerRaceHazardTypeForFrame({
    duration: 3,
    hazardType: 'gate',
    message: 'Gate pulse',
    race: eventRace,
  });
  const directEvent = runRaceTrackEventForFrame({
    compiled: { vehicleZones: [] },
    event: {
      action: 'set-lock',
      duration: 2,
      message: 'Lock',
    },
    race: eventRace,
  });
  const eventFrame = updateRaceTrackEventsForFrame({
    compiled: {
      events: [
        {
          action: 'trigger-hazard',
          hazardType: 'gate',
          key: 'timed-gate',
          message: 'Timed gate',
          time: 4,
          trigger: 'time',
        },
      ],
      vehicleZones: [],
    },
    dt: 0.1,
    race: eventRace,
    scoreRacer,
  });
  if (
    !typeTrigger.triggered ||
    typeTrigger.hazard !== eventRace.trackHazards[0] ||
    directEvent.switchLockUntil !== 7 ||
    eventFrame.trackEvents.length !== 1 ||
    eventFrame.trackEvents[0].trackEvent.hazard !== eventRace.trackHazards[0] ||
    !eventRace.eventFlags['fired:timed-gate'] ||
    eventRace.eventMessages.length < 3
  ) {
    fail('Race frame event helpers should preserve hazard trigger, direct event mutation, event scheduling, and messages', {
      directEvent,
      eventFrame,
      eventRace,
      typeTrigger,
    });
  }

  const collisionPlayer = {
    ghostTimer: 0,
    invincibleTimer: 0,
    position: new THREE.Vector3(5, 0, 0),
    velocity: new THREE.Vector3(-10, 0, 0),
    vehicleMode: 'kart',
  };
  const collisionStats = {
    collisionCount: 0,
    collisionImpactTime: null,
    collisionSpeedAfter: null,
    collisionSpeedBefore: null,
    collisionSpeedLossRatio: null,
  };
  const collisionFrame = resolveRaceWorldCollisionsForFrame({
    collisionCircles: [{ position: new THREE.Vector3(0, 0, 0), radius: 8 }],
    compiled: {
      nearest: () => ({ distance: 20, roadWidth: 10 }),
      roadWidth: 10,
    },
    race: {
      player: collisionPlayer,
      time: 7,
    },
    racer: collisionPlayer,
    vehicleMaxSpeed: 50,
    visualStats: collisionStats,
  });
  if (
    !collisionFrame.collided ||
    collisionStats.collisionCount !== 1 ||
    collisionStats.collisionImpactTime !== 7 ||
    collisionStats.collisionSpeedBefore !== 0.2 ||
    collisionStats.collisionSpeedAfter === null ||
    collisionStats.collisionSpeedLossRatio === null
  ) {
    fail('Race frame world-collision helper should preserve collision response and visual telemetry mutation', {
      collisionFrame,
      collisionStats,
    });
  }

  const rankingRace = {
    lastPlayerRank: 2,
    player: { lap: 1, progress: 0.9 },
    rivals: [{ lap: 1, progress: 0.2 }],
  };
  const rankingFrame = updateRaceRankingsForFrame({ race: rankingRace });
  if (
    rankingFrame.playerRank !== 1 ||
    rankingRace.lastPlayerRank !== 1 ||
    rankingRace.positionNotice?.text !== 'Position +1'
  ) {
    fail('Race frame ranking helper should preserve rank mutation and position notice assignment', {
      rankingFrame,
      rankingRace,
    });
  }
};

const validateRaceFrameClockHelpers = () => {
  const cappedFrame = resolveRaceFrameDelta({
    lastFrame: 1000,
    now: 1200,
    playtestEnabled: false,
  });
  const playtestFrame = resolveRaceFrameDelta({
    lastFrame: 1000,
    now: 1200,
    playtestEnabled: true,
  });
  const stats = { actualFps: 30, fps: 30 };
  const nextFps = updateRaceFrameStats({ dt: 0.02, elapsed: 0.04, stats });
  const phaseStats = { framePhaseMs: { render: 10 }, framePhaseMaxMs: { render: 12 }, frameWorkMs: 15 };
  const phaseResult = recordRaceFramePhaseStats({
    phases: {
      player: 4.2,
      render: 20,
    },
    stats: phaseStats,
    totalMs: 30,
  });
  const emptyPhaseStats = { frameWorkMs: 0 };
  recordRaceFramePhaseStats({
    phases: { render: 12 },
    stats: emptyPhaseStats,
    totalMs: 24,
  });
  const timedRace = {
    cameraShakeTimer: 0.04,
    positionNotice: { life: 0.01, text: 'Position +1' },
    screenFlashTimer: 0.02,
    time: 5,
  };
  const timers = updateRaceRuntimeTimers({ dt: 0.03, race: timedRace });
  const clockRace = {
    cameraShakeTimer: 0.2,
    positionNotice: { life: 0.2, text: 'Position +1' },
    screenFlashTimer: 0.12,
    time: 1,
  };
  const clockStats = { actualFps: 0, fps: 0 };
  const clockFrame = advanceRaceFrameClock({
    lastFrame: 2000,
    now: 2050,
    playtest: { enabled: false },
    race: clockRace,
    stats: clockStats,
  });

  if (
    Math.abs(cappedFrame.elapsed - 0.2) > 0.001 ||
    cappedFrame.dt !== 0.033 ||
    cappedFrame.lastFrame !== 1200 ||
    playtestFrame.dt !== 0.16 ||
    Math.abs(nextFps - 31.6) > 0.001 ||
    Math.abs(stats.actualFps - 29.6) > 0.001 ||
    stats.deliveredFps !== 25 ||
    stats.frameBudgetMissRatio !== 1 ||
    stats.frameCount !== 1 ||
    stats.frameDtMs !== 20 ||
    stats.frameElapsedMs !== 40 ||
    stats.frameElapsedTotalMs !== 40 ||
    stats.frameBudgetMissCount !== 1 ||
    Math.abs(phaseStats.framePhaseMs.render - 10.8) > 0.001 ||
    phaseStats.framePhaseMs.player !== 4.2 ||
    phaseStats.framePhaseMaxMs.render !== 20 ||
    phaseStats.framePhaseMaxMs.player !== 4.2 ||
    Math.abs(phaseStats.frameWorkMs - 16.2) > 0.001 ||
    phaseStats.frameWorkMaxMs !== 30 ||
    phaseResult.framePhaseMs !== phaseStats.framePhaseMs ||
    emptyPhaseStats.frameWorkMs !== 24 ||
    emptyPhaseStats.frameWorkMaxMs !== 24 ||
    emptyPhaseStats.framePhaseMs.render !== 12 ||
    Math.abs(timedRace.time - 5.03) > 0.001 ||
    Math.abs(timedRace.cameraShakeTimer - 0.01) > 0.001 ||
    timedRace.screenFlashTimer !== 0 ||
    timedRace.positionNotice !== null ||
    !timers.positionNoticeExpired ||
    clockFrame.dt !== 0.033 ||
    clockFrame.lastFrame !== 2050 ||
    Math.abs(clockRace.time - 1.033) > 0.001 ||
    clockRace.positionNotice?.life >= 0.2 ||
    clockStats.fps <= 0 ||
    clockStats.actualFps <= 0 ||
    clockStats.deliveredFps !== 20 ||
    clockStats.frameBudgetMissRatio !== 1 ||
    clockStats.frameCount !== 1 ||
    clockStats.frameElapsedMs !== 50 ||
    clockStats.frameElapsedTotalMs !== 50 ||
    clockStats.frameDtMs !== 33 ||
    clockStats.frameBudgetMissCount !== 1
  ) {
    fail('Race frame clock helpers should preserve dt caps, FPS smoothing, race timer decay, and notice expiry', {
      cappedFrame,
      clockFrame,
      clockRace,
      clockStats,
      nextFps,
      emptyPhaseStats,
      phaseResult,
      phaseStats,
      playtestFrame,
      timedRace,
      timers,
    });
  }
};

const validateRaceFinishRuntimeHelpers = () => {
  const compiled = { key: 'comeback-city-gp' };
  const race = {
    player: {
      bestLap: 73.4,
      finishTime: 214.9,
      rank: 2,
    },
  };
  const basePlaytest = {
    bananaMax: 12,
    enabled: true,
    hazardsEncountered: 3.456,
    itemBoxesCollected: 4,
    itemUses: 2,
    layers: new Set(['street', 'shortcut']),
    locks: 1,
    mode: 'kart',
    raceIndex: 7,
    signatureUsed: true,
    switchPads: 3,
    upgrades: 5,
    vehicles: new Set(['kart', 'hover']),
    zones: 6,
  };
  const normalResult = buildRaceFinishResult({
    compiled,
    playtest: { ...basePlaytest, enabled: false },
    race,
  });
  const playtestResult = buildRaceFinishResult({
    compiled,
    playtest: basePlaytest,
    race,
  });
  const finishEvents = [];
  let callbackResult = null;
  const windowRef = {};
  const publishedResult = publishRaceFinishResult({
    compiled,
    onFinishRef: { current: (result) => { callbackResult = result; } },
    playtest: basePlaytest,
    publishPlaytestResult: (result) => publishRacePlaytestResult({ result, windowRef }),
    race,
    recordPlaytest: (type, result) => finishEvents.push({ result, type }),
  });

  if (
    normalResult.bestLap !== 73.4 ||
    normalResult.place !== 2 ||
    normalResult.time !== 214.9 ||
    normalResult.trackKey !== 'comeback-city-gp' ||
    normalResult.playtest !== undefined ||
    playtestResult.playtest.hazardsEncountered !== 3.46 ||
    JSON.stringify(playtestResult.playtest.layers) !== JSON.stringify(['street', 'shortcut']) ||
    JSON.stringify(playtestResult.playtest.vehicles) !== JSON.stringify(['kart', 'hover']) ||
    playtestResult.playtest.signatureUsed !== true ||
    windowRef.__racePlaytestResult !== publishedResult ||
    finishEvents.length !== 1 ||
    finishEvents[0].type !== 'finish' ||
    finishEvents[0].result !== publishedResult ||
    callbackResult !== publishedResult
  ) {
    fail('Race finish runtime helpers should preserve result payloads, playtest globals, finish events, and callbacks', {
      callbackResult,
      finishEvents,
      normalResult,
      playtestResult,
      publishedResult,
      windowRef,
    });
  }
};

const validateRacePlayerFrameHelpers = () => {
  const createFramePlayer = (overrides = {}) => ({
    bananas: 0,
    blindTimer: 0,
    boostSource: null,
    boostTier: 0,
    boostTimer: 0,
    controlFlipTimer: 0,
    driftActive: false,
    driftCharge: 0,
    driftDirection: 0,
    driftHopTimer: 0,
    flightAltitude: 0,
    flightPitch: 0,
    flightRoll: 0,
    flightVerticalVelocity: 0,
    ghostTimer: 0,
    heading: Math.PI / 2,
    hitTimer: 0,
    invincibleTimer: 0,
    jumpCooldown: 0,
    jumpHeight: 0,
    jumpVelocity: 0,
    landingTimer: 0,
    liftDisabledTimer: 0,
    lightningRodTimer: 0,
    magnetTimer: 0,
    perfectBoostTimer: 0,
    planeBob: 0,
    polarity: 1,
    polaritySwapTimer: 0,
    position: new THREE.Vector3(0, 0, 0),
    progress: 0.1,
    rank: 1,
    shieldTimer: 0,
    steerInput: 1,
    stuckProbePosition: new THREE.Vector3(0, 0, 0),
    stuckRecoveryCooldown: 0,
    stuckTimer: 0,
    transformTimer: 0,
    vehicleMode: 'kart',
    velocity: new THREE.Vector3(18, 0, 0),
    ...overrides,
  });
  const compiled = {
    nearest: () => ({
      distance: 0,
      normal: new THREE.Vector3(0, 0, 1),
      point: new THREE.Vector3(0, 0, 0),
      roadWidth: 20,
      tangent: new THREE.Vector3(1, 0, 0),
    }),
    roadWidth: 20,
  };
  const bounds = {
    maxX: 500,
    maxZ: 500,
    minX: -500,
    minZ: -500,
  };
  const player = createFramePlayer();
  const race = {
    balloons: [
      {
        box: { pool: ['boost'] },
        cooldown: 0,
        position: new THREE.Vector3(2, 0, 0),
        type: { key: 'blue' },
      },
    ],
    bananas: [],
    cameraShakeTimer: 0,
    droppedBananas: [],
    droppedHazards: [],
    flightGates: [],
    player,
    rivals: [],
    screenFlashTimer: 0,
    time: 2.5,
    zippers: [{ cooldown: 0, position: new THREE.Vector3(2, 0, 0) }],
  };
  const boostCalls = [];
  const pickups = [];
  const visualStats = {
    boostPadActivationDelay: null,
    boostPadActivationTime: null,
    boostPadProbeStartTime: 2,
    boostPadSpeedAfter: null,
    boostPadSpeedBefore: null,
    driftHopDuration: null,
    driftHopStartCount: 0,
    driftHopStartTime: null,
    driftStartCount: 0,
    stuckRecoveryCount: 0,
  };
  let integrationCount = 0;
  const touchControls = { jump: true };
  const playerFrame = updateRacePlayerForFrame({
    addBoost: (racer, seconds, impulse, tier, source) => {
      boostCalls.push({ impulse, seconds, source, tier });
      applyBoost({
        forward: new THREE.Vector3(Math.sin(racer.heading), 0, Math.cos(racer.heading)),
        impulse,
        racer,
        seconds,
        source,
        tier,
        vehicle: VEHICLES[racer.vehicleMode] || VEHICLES.kart,
      });
    },
    applyVehicleIntegration: () => {
      integrationCount += 1;
    },
    bounds,
    collectBalloon: (balloon) => pickups.push(balloon),
    compiled,
    controls: { drift: true, jump: true, steer: 1, throttle: 1 },
    defaultVehicle: 'kart',
    distanceBetween: (a, b) => Math.hypot(a.x - b.x, a.z - b.z),
    dt: 0.1,
    race,
    resolveWorldCollisions: () => true,
    scoreRacer,
    touchControls,
    updateLapProgress: (racer, nearest) => {
      racer.progress = nearest.distance;
    },
    vehicles: VEHICLES,
    visualStats,
  });
  if (
    playerFrame.jumpQueued ||
    touchControls.jump ||
    player.layer !== 'ground' ||
    !player.driftActive ||
    visualStats.driftHopDuration !== DRIFT_HOP_DURATION ||
    visualStats.driftHopStartCount !== 1 ||
    visualStats.driftStartCount !== 1 ||
    pickups.length !== 1 ||
    !boostCalls.some((call) => call.source === 'pad') ||
    visualStats.boostPadActivationTime !== 2.5 ||
    visualStats.boostPadActivationDelay !== 0.5 ||
    race.cameraShakeTimer < 0.12 ||
    integrationCount !== 1
  ) {
    fail('Race player frame helper should preserve drift-hop, item pickup, boost-pad, collision, touch, and integration side effects', {
      boostCalls,
      cameraShakeTimer: race.cameraShakeTimer,
      integrationCount,
      layer: player.layer,
      pickups: pickups.length,
      playerFrame,
      touchControls,
      visualStats,
    });
  }

  const planePlayer = createFramePlayer({
    flightAltitude: FLIGHT_ALTITUDE_LIMITS.cruise,
    heading: 0,
    position: new THREE.Vector3(0, 0, 0),
    steerInput: 0,
    vehicleMode: 'plane',
    velocity: new THREE.Vector3(0, 0, 22),
  });
  const planeRace = {
    balloons: [],
    bananas: [],
    cameraShakeTimer: 0,
    droppedBananas: [],
    droppedHazards: [],
    flightGates: [],
    player: planePlayer,
    rivals: [],
    screenFlashTimer: 0,
    time: 1,
    zippers: [],
  };
  const planeTouchControls = { jump: true };
  updateRacePlayerForFrame({
    applyVehicleIntegration: () => {},
    bounds,
    compiled,
    controls: { drift: false, jump: true, steer: 0.5, throttle: 1 },
    dt: 0.1,
    race: planeRace,
    touchControls: planeTouchControls,
    updateLapProgress: () => {},
    vehicles: VEHICLES,
    visualStats: { stuckRecoveryCount: 0 },
  });
  if (
    !planeTouchControls.jump ||
    planePlayer.layer !== 'air' ||
    planePlayer.jumpHeight !== 0 ||
    !Number.isFinite(planePlayer.flightAltitude) ||
    !Number.isFinite(planePlayer.flightPitch) ||
    !Number.isFinite(planePlayer.flightRoll)
  ) {
    fail('Race player frame helper should preserve plane controls and flight-state updates', {
      flightAltitude: planePlayer.flightAltitude,
      flightPitch: planePlayer.flightPitch,
      flightRoll: planePlayer.flightRoll,
      jumpHeight: planePlayer.jumpHeight,
      layer: planePlayer.layer,
      planeTouchControls,
    });
  }
};

const validateRaceTelemetryHelpers = () => {
  const compiled = {
    surfaceZones: [{ progress: 0.2, type: 'boost-lane' }],
  };
  const nearest = { branchKey: 'garage-shortcut' };
  if (activeSurfaceFor({ compiled, nearest, offroad: true, progress: 0.2 }) !== 'offroad') {
    fail('Active surface should prioritize offroad state');
  }
  if (activeSurfaceFor({ compiled, nearest: {}, offroad: false, progress: 0.205 }) !== 'boost-lane') {
    fail('Active surface should report nearby authored surface zone');
  }
  if (activeSurfaceFor({ compiled: { surfaceZones: [] }, nearest, offroad: false, progress: 0.8 }) !== 'branch:garage-shortcut') {
    fail('Active surface should report branch key when no zone matches');
  }
  if (activeSurfaceFor({ compiled: { surfaceZones: [] }, nearest: {}, offroad: false, progress: 0.8 }) !== 'asphalt') {
    fail('Active surface should fall back to asphalt');
  }

  const camera = new THREE.PerspectiveCamera(66, 16 / 9, 0.1, 1000);
  camera.position.set(0, 10, -30);
  camera.lookAt(0, 1, 28);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  const playerGroup = new THREE.Group();
  playerGroup.add(new THREE.Mesh(new THREE.BoxGeometry(4, 2, 6), new THREE.MeshBasicMaterial()));
  const playerBoostBurstGroup = new THREE.Group();
  playerBoostBurstGroup.userData.kind = 'boost-burst-streak';
  playerBoostBurstGroup.visible = true;
  playerGroup.add(playerBoostBurstGroup);
  const playerShieldGroup = new THREE.Group();
  playerShieldGroup.userData.kind = 'shield-visual';
  playerShieldGroup.visible = true;
  playerGroup.add(playerShieldGroup);
  const playerShieldBurstGroup = new THREE.Group();
  playerShieldBurstGroup.userData.kind = 'shield-burst-crown';
  playerShieldBurstGroup.visible = true;
  playerGroup.add(playerShieldBurstGroup);
  const playerDriftTrailGroup = new THREE.Group();
  playerDriftTrailGroup.userData.kind = 'drift-trail-visual';
  playerDriftTrailGroup.visible = true;
  playerGroup.add(playerDriftTrailGroup);
  playerGroup.position.set(0, 1, 0);
  playerGroup.updateMatrixWorld(true);
  const telemetryPlayer = {
    bananas: 3,
    boostSource: 'drift',
    boostTier: 2,
    boostTimer: 0.4,
    doubleSlotUses: 1,
    driftActive: true,
    driftCharge: 1.1,
    driftHopTimer: 0.12,
    flightAltitude: 0,
    heldBalloon: { itemKey: 'boost' },
    heldItem: { itemKey: 'boost', level: 2 },
    jumpHeight: 0,
    lap: 2,
    lapSplits: [12.3, 11.8],
    perfectBoostTimer: 0.1,
    position: new THREE.Vector3(0, 0, 0),
    progress: 0.2,
    rank: 1,
    rareNextPickup: true,
    secondaryHeldItem: null,
    shieldTimer: 0.5,
    steerInput: 0.4,
    stuckRecoveryCooldown: 0.2,
    stuckTimer: 0.3,
    vehicleMode: 'kart',
    velocity: new THREE.Vector3(0, 0, 40),
  };
  const telemetryRace = {
    audioMuted: true,
    player: telemetryPlayer,
    positionNotice: { life: 0.8, text: 'Position +1' },
    reducedMotion: true,
    rivals: [{ finished: false, position: new THREE.Vector3(0, 0, 20) }],
    screenFlashTimer: 0.2,
    time: 1.5,
  };
  const telemetryCompiled = {
    branchRoutes: [{ decisionCueProgress: 0.22, startProgress: 0.24 }],
    courseV2: {
      assetLoadState: {
        externalAssets: 2,
        manifestPath: '/assets/test.json',
        missing: [],
        state: 'loaded',
      },
    },
    key: 'unit-track',
    laps: 3,
    roadWidth: 20,
    surfaceZones: [{ progress: 0.2, type: 'boost-lane' }],
    totalLength: 500,
    nearest: () => ({
      branchKey: null,
      distance: 0,
      point: new THREE.Vector3(0, 0, 20),
      roadWidth: 20,
      tangent: new THREE.Vector3(0, 0, 1),
    }),
    pointAt: (progress) => ({
      point: new THREE.Vector3(0, 0, progress * 500),
      progress,
      tangent: new THREE.Vector3(0, 0, 1),
    }),
  };
  const telemetryStats = {
    ...createRaceTelemetryStats(),
    boostPadActivationDelay: 0.16,
    boostPadActivationTime: 1.2,
    boostPadSpeedAfter: 0.7,
    boostPadSpeedBefore: 0.4,
    collisionCount: 1,
    collisionImpactTime: 1,
    collisionSpeedAfter: 0.4,
    collisionSpeedBefore: 0.8,
    collisionSpeedLossRatio: 0.5,
    deliveredFps: 48.4,
    frameBudgetMissRatio: 0.18,
    frameCount: 91,
    frameElapsedTotalMs: 1880,
    framePhaseMaxMs: { render: 8.5 },
    framePhaseMs: { render: 4.5, syncMeshes: 2.25 },
    frameWorkMaxMs: 22.5,
    frameWorkMs: 12.5,
    itemBoxPickupDelay: 0.2,
    itemBoxPickupKey: 'boost',
    itemBoxPickupTime: 1.1,
    itemBoxSourceType: 'blue',
    stuckRecoveryCount: 1,
    telemetryIntervalMs: 90,
    telemetryPublishCount: 4,
    telemetrySkipCount: 9,
  };
  const telemetryWindow = {};
  const telemetryBoostPad = new THREE.Group();
  telemetryBoostPad.userData.kind = 'boost-pad-visual';
  telemetryBoostPad.userData.visualActive = true;
  const telemetryBoostPadChevron = new THREE.Object3D();
  telemetryBoostPadChevron.userData.kind = 'boost-pad-chevron';
  telemetryBoostPadChevron.visible = true;
  telemetryBoostPad.add(telemetryBoostPadChevron);
  const telemetryRenderer = {
    info: {
      memory: {
        geometries: 321,
        textures: 12,
      },
      programs: [{ id: 1 }, { id: 2 }],
      render: {
        calls: 222,
        frame: 19,
        lines: 7,
        points: 3,
        triangles: 54321,
      },
    },
  };
  const rendererInfoTelemetry = rendererInfoTelemetryFor(telemetryRenderer);
  let hudTelemetry = null;
  const telemetryFrame = publishRaceTelemetryFrame({
    boostPadMeshes: [telemetryBoostPad],
    brakingTelemetryActive: true,
    camera,
    cameraRouteLookahead: {
      curvature: 0.25,
      distance: 62,
      seconds: 1.24,
      usedRoute: true,
    },
    collisionCircles: [],
    compiled: telemetryCompiled,
    driftTuning: { kart: { sparkChargeTime: [0.5, 1.0, 2.0] } },
    kartOnly: true,
    playtest: { enabled: true, mode: 'visual-kart', visualScenario: 'braking' },
    playerVehicleGroup: playerGroup,
    race: telemetryRace,
    renderer: telemetryRenderer,
    setTelemetry: (nextTelemetry) => {
      hudTelemetry = nextTelemetry;
    },
    stats: telemetryStats,
    vehicles: { kart: { maxSpeed: 50, offroad: 0.6, reverse: 12.5 } },
    windowRef: telemetryWindow,
  });
  const diagnostics = createRaceTelemetryDiagnostics(telemetryWindow);
  const diagnosticsTelemetry = diagnostics.publish({
    playtest: { enabled: true },
    race: telemetryRace,
    raceVisualTelemetry: telemetryFrame.raceVisualTelemetry,
  });
  if (
    telemetryFrame.driftTier !== 2 ||
    telemetryFrame.normalizedSpeed !== 0.8 ||
    telemetryFrame.heldItemKey !== 'boost' ||
    telemetryStats.timeToSpeed80 !== 1.5 ||
    telemetryStats.reverseSpeedCapRatio !== 0.25 ||
    !telemetryStats.branchVisibleSeen ||
    diagnosticsTelemetry !== telemetryFrame.raceVisualTelemetry ||
    telemetryWindow.__raceVisualTelemetrySamples.length !== 1 ||
    telemetryWindow.__raceVisualTelemetry.reducedMotion !== true ||
    telemetryWindow.__raceVisualTelemetry.player.audioMuted !== true ||
    telemetryWindow.__raceVisualTelemetry.player.boostBurstVisualActive !== true ||
    telemetryWindow.__raceVisualTelemetry.player.boostPadVisualActive !== true ||
    telemetryWindow.__raceVisualTelemetry.player.boostSource !== 'drift' ||
    telemetryWindow.__raceVisualTelemetry.player.driftTierSeen !== 2 ||
    telemetryWindow.__raceVisualTelemetry.player.driftTrailVisualActive !== true ||
    telemetryWindow.__raceVisualTelemetry.player.reducedMotion !== true ||
    telemetryWindow.__raceVisualTelemetry.player.shieldBurstVisualActive !== true ||
    telemetryWindow.__raceVisualTelemetry.player.shieldVisualActive !== true ||
    telemetryWindow.__raceVisualTelemetry.camera.routeLookaheadUsed !== true ||
    telemetryWindow.__raceVisualTelemetry.renderer.calls !== 222 ||
    telemetryWindow.__raceVisualTelemetry.renderer.triangles !== 54321 ||
    telemetryWindow.__raceVisualTelemetry.renderer.geometries !== 321 ||
    telemetryWindow.__raceVisualTelemetry.renderer.programs !== 2 ||
    telemetryWindow.__raceVisualTelemetry.deliveredFps !== 48.4 ||
    telemetryWindow.__raceVisualTelemetry.frameBudgetMissRatio !== 0.18 ||
    telemetryWindow.__raceVisualTelemetry.frameCount !== 91 ||
    telemetryWindow.__raceVisualTelemetry.frameElapsedTotalMs !== 1880 ||
    telemetryWindow.__raceVisualTelemetry.framePhaseMs.render !== 4.5 ||
    telemetryWindow.__raceVisualTelemetry.framePhaseMs.syncMeshes !== 2.25 ||
    telemetryWindow.__raceVisualTelemetry.framePhaseMaxMs.render !== 8.5 ||
    telemetryWindow.__raceVisualTelemetry.telemetry.intervalMs !== 90 ||
    telemetryWindow.__raceVisualTelemetry.telemetry.publishCount !== 4 ||
    telemetryWindow.__raceVisualTelemetry.telemetry.skipCount !== 9 ||
    telemetryWindow.__raceVisualTelemetry.frameWorkMs !== 12.5 ||
    telemetryWindow.__raceVisualTelemetry.frameWorkMaxMs !== 22.5 ||
    telemetryWindow.__raceVisualTelemetry.player.progress !== 0.2 ||
    telemetryWindow.__raceVisualTelemetry.race.heldItemKey !== 'boost' ||
    telemetryWindow.__raceVisualTelemetry.race.visibleRivalsSeen !== 1 ||
    telemetryStats.visibleRivalsSeen !== 1 ||
    hudTelemetry?.lap !== 2 ||
    hudTelemetry?.boostTier !== 2 ||
    hudTelemetry?.audioMuted !== true ||
    hudTelemetry?.reducedMotion !== true ||
    hudTelemetry?.speed !== 232 ||
    !hudTelemetry?.upgradeAvailable
  ) {
    fail('Race telemetry frame publisher should preserve visual telemetry, playtest samples, stats mutation, and HUD telemetry mapping', {
      hudTelemetry,
      telemetryFrame,
      telemetryStats,
      telemetryWindow,
    });
  }
  playerShieldBurstGroup.visible = false;
  if (playerShieldBurstVisualActive(playerGroup)) {
    fail('Shield burst telemetry helper should require a visible shield-burst-crown node');
  }
  playerShieldBurstGroup.visible = true;
  playerBoostBurstGroup.visible = false;
  if (playerBoostBurstVisualActive(playerGroup)) {
    fail('Boost burst telemetry helper should require a visible boost-burst-streak node');
  }
  playerBoostBurstGroup.visible = true;
  const noVisualStats = createRaceTelemetryStats();
  let noVisualHudTelemetry = null;
  const noVisualFrame = publishRaceTelemetryFrame({
    camera: {
      position: {
        distanceTo: () => fail('Visual telemetry should not read camera distance when disabled'),
      },
    },
    cameraRouteLookahead: {
      seconds: 1.24,
      usedRoute: true,
    },
    collisionCircles: [
      {
        position: new THREE.Vector3(999, 0, 999),
        radius: 12,
      },
    ],
    compiled: {
      ...telemetryCompiled,
      pointAt: () => fail('Visual telemetry should not sample road points when disabled'),
    },
    includeVisualTelemetry: false,
    playerVehicleGroup: {
      updateMatrixWorld: () => fail('Visual telemetry should not measure player screen coverage when disabled'),
    },
    race: telemetryRace,
    renderer: {
      get info() {
        fail('Visual telemetry should not read renderer counters when disabled');
        return null;
      },
    },
    setTelemetry: (nextTelemetry) => {
      noVisualHudTelemetry = nextTelemetry;
    },
    stats: noVisualStats,
    vehicles: { kart: { maxSpeed: 50, offroad: 0.6, reverse: 12.5 } },
  });
  if (
    noVisualFrame.raceVisualTelemetry !== null ||
    noVisualFrame.normalizedSpeed !== 0.8 ||
    noVisualFrame.visibleBranchCount !== 0 ||
    noVisualStats.branchVisibleSeen ||
    noVisualStats.visibleRivalsSeen !== 0 ||
    noVisualHudTelemetry?.lap !== 2 ||
    noVisualHudTelemetry?.speed !== 232 ||
    noVisualHudTelemetry?.audioMuted !== true
  ) {
    fail('Race telemetry frame publisher should skip visual diagnostics while preserving HUD telemetry', {
      noVisualFrame,
      noVisualHudTelemetry,
      noVisualStats,
    });
  }
  if (
    rendererInfoTelemetry.calls !== 222 ||
    rendererInfoTelemetry.frame !== 19 ||
    rendererInfoTelemetry.geometries !== 321 ||
    rendererInfoTelemetry.lines !== 7 ||
    rendererInfoTelemetry.points !== 3 ||
    rendererInfoTelemetry.programs !== 2 ||
    rendererInfoTelemetry.textures !== 12 ||
    rendererInfoTelemetry.triangles !== 54321 ||
    rendererInfoTelemetryFor(null) !== null
  ) {
    fail('Race renderer info telemetry helper should map Three.js renderer counters', {
      rendererInfoTelemetry,
    });
  }
};

const validateRaceTelemetryRuntimeHelpers = () => {
  const camera = { tag: 'camera' };
  const boostPadMeshes = [{ tag: 'boost-pad' }];
  const collisionCircles = [{ tag: 'collision' }];
  const compiled = { key: 'telemetry-runtime-test' };
  const playerVehicleGroup = { tag: 'player-group' };
  const playtest = { enabled: true };
  const race = { time: 1.25 };
  const renderer = { tag: 'renderer' };
  const stats = { fps: 60 };
  const telemetryPayloads = [];
  const setTelemetry = () => {};
  const vehicles = { kart: { maxSpeed: 58 } };
  const windowRef = { tag: 'window' };
  let routeLookahead = { seconds: 1.1 };
  const runtime = createRaceTelemetryRuntime({
    camera,
    boostPadMeshes,
    collisionCircles,
    compiled,
    getCameraRouteLookahead: () => routeLookahead,
    includeVisualTelemetry: false,
    intervalMs: 90,
    kartOnly: true,
    playtest,
    playerVehicleGroup,
    publishFrame: (payload) => {
      telemetryPayloads.push(payload);
    },
    race,
    renderer,
    setTelemetry,
    stats,
    vehicles,
    windowRef,
  });

  const firstAttempt = runtime.publishTelemetry(80);
  const firstPublish = runtime.publishTelemetry(91);
  routeLookahead = { seconds: 1.4 };
  const skippedPublish = runtime.publishTelemetry(160);
  const secondPublish = runtime.publishTelemetry(182);
  const defaultStats = {};
  const defaultRuntime = createRaceTelemetryRuntime({
    camera,
    compiled,
    publishFrame: () => {},
    race,
    stats: defaultStats,
  });
  const defaultSkippedPublish = defaultRuntime.publishTelemetry(DEFAULT_RACE_TELEMETRY_INTERVAL_MS);
  const defaultFirstPublish = defaultRuntime.publishTelemetry(DEFAULT_RACE_TELEMETRY_INTERVAL_MS + 1);

  if (
    firstAttempt !== false ||
    firstPublish !== true ||
    skippedPublish !== false ||
    secondPublish !== true ||
    runtime.getLastTelemetry() !== 182 ||
    stats.telemetryIntervalMs !== 90 ||
    stats.telemetryPublishCount !== 2 ||
    stats.telemetrySkipCount !== 2 ||
    defaultSkippedPublish !== false ||
    defaultFirstPublish !== true ||
    defaultStats.telemetryIntervalMs !== DEFAULT_RACE_TELEMETRY_INTERVAL_MS ||
    defaultStats.telemetryPublishCount !== 1 ||
    defaultStats.telemetrySkipCount !== 1 ||
    telemetryPayloads.length !== 2 ||
    telemetryPayloads[0].camera !== camera ||
    telemetryPayloads[0].boostPadMeshes !== boostPadMeshes ||
    telemetryPayloads[0].cameraRouteLookahead.seconds !== 1.1 ||
    telemetryPayloads[0].collisionCircles !== collisionCircles ||
    telemetryPayloads[0].compiled !== compiled ||
    telemetryPayloads[0].includeVisualTelemetry !== false ||
    telemetryPayloads[0].kartOnly !== true ||
    telemetryPayloads[0].playtest !== playtest ||
    telemetryPayloads[0].playerVehicleGroup !== playerVehicleGroup ||
    telemetryPayloads[0].race !== race ||
    telemetryPayloads[0].renderer !== renderer ||
    telemetryPayloads[0].setTelemetry !== setTelemetry ||
    telemetryPayloads[0].stats !== stats ||
    telemetryPayloads[0].vehicles !== vehicles ||
    telemetryPayloads[0].windowRef !== windowRef ||
    telemetryPayloads[1].cameraRouteLookahead.seconds !== 1.4
  ) {
    fail('Race telemetry runtime helper should preserve publication cadence and telemetry argument wiring', {
      firstAttempt,
      firstPublish,
      lastTelemetry: runtime.getLastTelemetry(),
      secondPublish,
      skippedPublish,
      telemetryPayloads,
    });
  }
};

const validateRaceControlHelpers = () => {
  const touchDefaults = defaultRaceTouchControls();
  const secondTouchDefaults = defaultRaceTouchControls();
  if (
    touchDefaults === secondTouchDefaults ||
    touchDefaults.brake !== 0 ||
    touchDefaults.drift ||
    touchDefaults.jump ||
    touchDefaults.steer !== 0 ||
    touchDefaults.throttle !== 0 ||
    !RACE_RELEVANT_KEY_CODES.includes('Space') ||
    !RACE_RELEVANT_KEY_CODES.includes('KeyW') ||
    !RACE_RELEVANT_KEY_CODES.includes('ArrowLeft') ||
    !RACE_RELEVANT_KEY_CODES.includes('ShiftRight')
  ) {
    fail('Race control defaults should preserve touch-state shape and relevant keyboard controls', {
      relevantKeys: RACE_RELEVANT_KEY_CODES,
      secondTouchDefaults,
      touchDefaults,
    });
  }

  const keyEvents = [];
  const createKeyEvent = (code) => ({
    code,
    preventDefault: () => keyEvents.push(`prevent:${code}`),
  });
  const liveKeys = new Set();
  const firstSpaceDown = applyRaceKeyDown({
    event: createKeyEvent('Space'),
    jumpQueued: false,
    keys: liveKeys,
    relevantKeys: RACE_RELEVANT_KEY_CODES,
  });
  const repeatedSpaceDown = applyRaceKeyDown({
    event: createKeyEvent('Space'),
    jumpQueued: firstSpaceDown.jumpQueued,
    keys: liveKeys,
    relevantKeys: RACE_RELEVANT_KEY_CODES,
  });
  const ignoredKeyDown = applyRaceKeyDown({
    event: createKeyEvent('Digit1'),
    jumpQueued: repeatedSpaceDown.jumpQueued,
    keys: liveKeys,
    relevantKeys: RACE_RELEVANT_KEY_CODES,
  });
  const keyUp = applyRaceKeyUp({
    event: createKeyEvent('Space'),
    keys: liveKeys,
    relevantKeys: RACE_RELEVANT_KEY_CODES,
  });
  const ignoredKeyUp = applyRaceKeyUp({
    event: createKeyEvent('Digit1'),
    keys: liveKeys,
    relevantKeys: RACE_RELEVANT_KEY_CODES,
  });
  const touchPatchState = defaultRaceTouchControls();
  const touchEvents = [];
  const createPointerEvent = (id) => ({
    currentTarget: {
      releasePointerCapture: (pointerId) => touchEvents.push(`release:${pointerId}`),
      setPointerCapture: (pointerId) => touchEvents.push(`set:${pointerId}`),
    },
    pointerId: id,
    preventDefault: () => touchEvents.push(`prevent:${id}`),
  });
  applyRaceTouchPatch({
    event: createPointerEvent(31),
    patch: { steer: -1, throttle: 1 },
    touch: touchPatchState,
  });
  applyRaceTouchPatch({
    capture: 'release',
    event: createPointerEvent(31),
    patch: { steer: 0, throttle: 0 },
    touch: touchPatchState,
  });
  if (
    !firstSpaceDown.handled ||
    !firstSpaceDown.jumpQueued ||
    !repeatedSpaceDown.handled ||
    !repeatedSpaceDown.jumpQueued ||
    ignoredKeyDown.handled ||
    !keyUp.handled ||
    ignoredKeyUp.handled ||
    liveKeys.has('Space') ||
    keyEvents.filter((entry) => entry === 'prevent:Space').length !== 3 ||
    keyEvents.includes('prevent:Digit1') ||
    touchPatchState.steer !== 0 ||
    touchPatchState.throttle !== 0 ||
    JSON.stringify(touchEvents) !== JSON.stringify(['prevent:31', 'set:31', 'prevent:31', 'release:31'])
  ) {
    fail('Race input event helpers should preserve key filtering, jump queueing, key release, and touch pointer capture behavior', {
      firstSpaceDown,
      ignoredKeyDown,
      ignoredKeyUp,
      keyEvents,
      keyUp,
      liveKeys: [...liveKeys],
      repeatedSpaceDown,
      touchEvents,
      touchPatchState,
    });
  }

  const keyboardControls = resolveRaceControls({
    jumpQueued: true,
    keys: new Set(['ArrowLeft', 'KeyA', 'KeyS', 'KeyW', 'ShiftRight']),
    touch: { ...defaultRaceTouchControls(), steer: -0.8 },
  });
  const touchControls = resolveRaceControls({
    keys: [],
    touch: { brake: 1, drift: true, jump: true, steer: 0.7, throttle: 1 },
  });
  if (
    keyboardControls.brake !== 1 ||
    !keyboardControls.drift ||
    !keyboardControls.jump ||
    keyboardControls.steer !== -1 ||
    Math.abs(keyboardControls.throttle - 0.1) > 0.001 ||
    touchControls.brake !== 1 ||
    !touchControls.drift ||
    !touchControls.jump ||
    touchControls.steer !== 0.7 ||
    Math.abs(touchControls.throttle - 0.1) > 0.001
  ) {
    fail('Race controls should combine keyboard and touch inputs with clamped steering and brake-throttle blending', {
      keyboardControls,
      touchControls,
    });
  }

  const driftingVisualControls = resolveRaceControls({
    playtest: { enabled: true, mode: 'visual-kart', visualScenario: 'drift-mechanics' },
    visualStats: { boostSourcesSeen: {}, driftTierSeen: 1, steeringTurn90Time: null, timeFromTopSpeedTo25: null },
  });
  const releasedDriftVisualControls = resolveRaceControls({
    playtest: { enabled: true, mode: 'visual-kart', visualScenario: 'drift-mechanics' },
    visualStats: { boostSourcesSeen: { drift: true }, driftTierSeen: 2, steeringTurn90Time: null, timeFromTopSpeedTo25: null },
  });
  const brakingVisualControls = resolveRaceControls({
    playtest: { enabled: true, mode: 'visual-kart', visualScenario: 'braking' },
    visualStats: { boostSourcesSeen: {}, driftTierSeen: 0, steeringTurn90Time: null, timeFromTopSpeedTo25: null },
  });
  const brakingCompleteVisualControls = resolveRaceControls({
    playtest: { enabled: true, mode: 'visual-kart', visualScenario: 'braking' },
    visualStats: { boostSourcesSeen: {}, driftTierSeen: 0, steeringTurn90Time: null, timeFromTopSpeedTo25: 1.05 },
  });
  const reverseVisualControls = resolveRaceControls({
    playtest: { enabled: true, mode: 'visual-kart', visualScenario: 'reverse' },
    visualStats: { boostSourcesSeen: {}, driftTierSeen: 0, steeringTurn90Time: null, timeFromTopSpeedTo25: null },
  });
  const accelerationVisualControls = resolveRaceControls({
    playtest: { enabled: true, mode: 'visual-kart', visualScenario: 'acceleration' },
    visualStats: { boostSourcesSeen: {}, driftTierSeen: 0, steeringTurn90Time: null, timeFromTopSpeedTo25: null },
  });
  const steeringVisualControls = resolveRaceControls({
    playtest: { enabled: true, mode: 'visual-kart', visualScenario: 'steering-high-speed' },
    visualStats: { boostSourcesSeen: {}, driftTierSeen: 0, steeringTurn90Time: null, timeFromTopSpeedTo25: null },
  });
  const steeringCompleteVisualControls = resolveRaceControls({
    playtest: { enabled: true, mode: 'visual-kart', visualScenario: 'steering-high-speed' },
    visualStats: { boostSourcesSeen: {}, driftTierSeen: 0, steeringTurn90Time: 1.2, timeFromTopSpeedTo25: null },
  });
  if (
    driftingVisualControls.brake !== 0 ||
    !driftingVisualControls.drift ||
    driftingVisualControls.jump ||
    driftingVisualControls.steer !== 1 ||
    driftingVisualControls.throttle !== 0 ||
    releasedDriftVisualControls.drift ||
    releasedDriftVisualControls.steer !== 0 ||
    releasedDriftVisualControls.throttle !== 0 ||
    brakingVisualControls.brake !== 1 ||
    brakingVisualControls.throttle !== -0.9 ||
    brakingCompleteVisualControls.brake !== 0 ||
    brakingCompleteVisualControls.throttle !== 0 ||
    reverseVisualControls.brake !== 0 ||
    reverseVisualControls.throttle !== -0.9 ||
    accelerationVisualControls.throttle !== 1 ||
    steeringVisualControls.steer !== 1 ||
    steeringVisualControls.throttle !== 0 ||
    steeringCompleteVisualControls.steer !== 0 ||
    steeringCompleteVisualControls.throttle !== 0
  ) {
    fail('Race visual test controls should preserve scripted acceleration, braking, drift, reverse, and steering inputs', {
      accelerationVisualControls,
      brakingCompleteVisualControls,
      brakingVisualControls,
      driftingVisualControls,
      releasedDriftVisualControls,
      reverseVisualControls,
      steeringCompleteVisualControls,
      steeringVisualControls,
    });
  }

  const commandCalls = [];
  const commandActions = {
    buyDoubleSlot: () => {
      commandCalls.push('upgrade-double');
      return { bought: true };
    },
    buyRareNextPickup: () => {
      commandCalls.push('upgrade-rare');
      return { bought: true };
    },
    cycleVehicle: () => {
      commandCalls.push('vehicle');
      return true;
    },
    resetPlayer: () => {
      commandCalls.push('reset');
      return true;
    },
    upgradeHeldItem: () => {
      commandCalls.push('upgrade-tier');
      return { upgraded: true };
    },
    useBankedItem: (type) => {
      commandCalls.push(`banked:${type}`);
      return type !== 'shield';
    },
    useHeldBalloon: () => {
      commandCalls.push('item');
      return true;
    },
  };
  const handledBoostCommand = handleRaceCommand({
    actions: commandActions,
    command: { id: 1, type: 'boost' },
  });
  const handledShieldCommand = handleRaceCommand({
    actions: commandActions,
    command: { id: 2, type: 'shield' },
  });
  const handledItemCommand = handleRaceCommand({
    actions: commandActions,
    command: { id: 3, type: 'item' },
  });
  const handledResetCommand = handleRaceCommand({
    actions: commandActions,
    command: { id: 4, type: 'reset' },
  });
  const missingCommand = handleRaceCommand({
    actions: commandActions,
    command: {},
  });
  const keyCommands = new Set(['KeyF', 'KeyC', 'KeyQ', 'KeyE', 'KeyR', 'KeyZ', 'KeyX', 'KeyV', 'KeyW']);
  const consumedKeys = consumeRaceKeyCommands({
    actions: commandActions,
    keys: keyCommands,
  });
  const frameCommandCalls = [];
  const frameCommandActions = {
    resetPlayer: () => {
      frameCommandCalls.push('reset');
      return true;
    },
    useBankedItem: (type) => {
      frameCommandCalls.push(`banked:${type}`);
      return true;
    },
    useHeldBalloon: () => {
      frameCommandCalls.push('item');
      return true;
    },
  };
  const frameCommandState = {
    lastExternalCommandId: 0,
    lastLocalCommandId: 0,
  };
  const frameCommandKeys = new Set(['KeyF', 'KeyW']);
  const commandFrame = processRaceCommandFrame({
    actions: frameCommandActions,
    commandState: frameCommandState,
    externalCommand: { id: 11, type: 'boost' },
    keys: frameCommandKeys,
    localCommand: { id: 12, type: 'reset' },
  });
  const repeatedCommandFrame = processRaceCommandFrame({
    actions: frameCommandActions,
    commandState: frameCommandState,
    externalCommand: { id: 11, type: 'boost' },
    keys: frameCommandKeys,
    localCommand: { id: 12, type: 'reset' },
  });
  if (
    !handledBoostCommand.handled ||
    handledShieldCommand.handled ||
    !handledItemCommand.handled ||
    !handledResetCommand.handled ||
    missingCommand.handled ||
    consumedKeys.length !== 8 ||
    keyCommands.has('KeyF') ||
    !keyCommands.has('KeyW') ||
    !commandCalls.includes('banked:boost') ||
    !commandCalls.includes('banked:rocket') ||
    !commandCalls.includes('upgrade-double') ||
    !commandFrame.externalCommandResult?.handled ||
    !commandFrame.localCommandResult?.handled ||
    commandFrame.keyCommandResults.length !== 1 ||
    commandFrame.commandState.lastExternalCommandId !== 11 ||
    commandFrame.commandState.lastLocalCommandId !== 12 ||
    repeatedCommandFrame.externalCommandResult !== null ||
    repeatedCommandFrame.localCommandResult !== null ||
    repeatedCommandFrame.keyCommandResults.length !== 0 ||
    frameCommandKeys.has('KeyF') ||
    !frameCommandKeys.has('KeyW') ||
    JSON.stringify(frameCommandCalls) !== JSON.stringify(['banked:boost', 'reset', 'item'])
  ) {
    fail('Race command helpers should dispatch external commands and consume one-shot key commands', {
      commandCalls,
      commandFrame,
      consumedKeys,
      frameCommandCalls,
      frameCommandKeys: [...frameCommandKeys],
      frameCommandState,
      handledBoostCommand,
      handledItemCommand,
      handledResetCommand,
      handledShieldCommand,
      keyCommands: [...keyCommands],
      missingCommand,
      repeatedCommandFrame,
    });
  }
};

const validateRaceRuntimeSetupHelpers = () => {
  const track = RACE_TRACKS.find((entry) => entry.key === 'comeback-city') || RACE_TRACKS[0];
  const runtimeSetup = createRaceRuntimeSetup({
    profile: { racerName: 'Setup Test' },
    search: '?raceAutoplay=1&raceMode=visual-kart&raceIndex=5&raceVisualScenario=drift',
    track,
  });
  const fallbackVehicle = defaultRaceVehicleFor({
    compiled: { raceStyle: 'unknown-style' },
    track: { raceStyle: 'unknown-style' },
  });
  const kartOnlyVehicle = defaultRaceVehicleFor({
    compiled: { courseV2: { kartOnly: true }, raceStyle: 'ride' },
    track: { raceStyle: 'ride' },
  });

  if (
    runtimeSetup.compiled.key !== track.key ||
    !runtimeSetup.playtest.enabled ||
    runtimeSetup.playtest.mode !== 'visual-kart' ||
    runtimeSetup.playtest.raceIndex !== 5 ||
    runtimeSetup.playtest.visualScenario !== 'drift' ||
    runtimeSetup.kartOnly !== Boolean(runtimeSetup.compiled.kartOnly || runtimeSetup.compiled.courseV2?.kartOnly) ||
    runtimeSetup.defaultVehicle !== runtimeSetup.race.defaultVehicle ||
    runtimeSetup.race.player.vehicleMode !== runtimeSetup.defaultVehicle ||
    !(runtimeSetup.keys instanceof Set) ||
    runtimeSetup.keys.size !== 0 ||
    !(runtimeSetup.relevantKeys instanceof Set) ||
    !runtimeSetup.relevantKeys.has('Space') ||
    !runtimeSetup.relevantKeys.has('KeyW') ||
    runtimeSetup.visualStats.fps !== 60 ||
    runtimeSetup.visualStats.timeToSpeed80 !== null ||
    fallbackVehicle !== 'kart' ||
    kartOnlyVehicle !== 'kart'
  ) {
    fail('Race runtime setup helper should preserve track compilation, playtest parsing, default vehicle selection, race state, key sets, and visual stats', {
      fallbackVehicle,
      kartOnlyVehicle,
      runtimeSetup: {
        compiledKey: runtimeSetup.compiled.key,
        defaultVehicle: runtimeSetup.defaultVehicle,
        kartOnly: runtimeSetup.kartOnly,
        playtest: runtimeSetup.playtest,
        playerVehicleMode: runtimeSetup.race.player.vehicleMode,
        raceDefaultVehicle: runtimeSetup.race.defaultVehicle,
        relevantKeys: [...runtimeSetup.relevantKeys],
        visualStats: runtimeSetup.visualStats,
      },
      trackKey: track.key,
    });
  }
};

const validateRaceRuntimeSceneHelpers = () => {
  const canvas = { tag: 'canvas' };
  const camera = { tag: 'camera' };
  const scene = { tag: 'scene' };
  const world = { tag: 'world' };
  const renderer = { tag: 'renderer' };
  const compiled = {
    key: 'runtime-scene-test',
  };
  const race = {
    zippers: [
      { key: 'zipper-a' },
      { key: 'zipper-b' },
    ],
  };
  const onWebGLUnavailable = () => {};
  const theme = { sky: '#123456' };
  const visualPalette = { accent: '#abcdef' };
  const calls = {
    boostPads: [],
  };
  const runtimeScene = createRaceRuntimeScene({
    canvas,
    compiled,
    defaultVehicle: 'kart',
    onWebGLUnavailable,
    profile: { avatar: { suit: '#111111' } },
    race,
    themeByTrack: {
      [compiled.key]: theme,
    },
    visualPalette,
    createSceneShell: ({ theme: sceneTheme }) => {
      calls.sceneTheme = sceneTheme;
      return { camera, scene, world };
    },
    createRenderer: ({ canvas: rendererCanvas, onUnavailable }) => {
      calls.rendererCanvas = rendererCanvas;
      calls.rendererUnavailableHandler = onUnavailable;
      return renderer;
    },
    createTrack: ({ compiled: trackCompiled, theme: trackTheme, world: trackWorld }) => {
      calls.track = { compiled: trackCompiled, theme: trackTheme, world: trackWorld };
      return {
        cleanCityCourse: true,
        dimensions: {
          bounds: { maxX: 12, maxZ: 18, minX: -4, minZ: -6 },
          trackCenterX: 4,
          trackCenterZ: 6,
          trackSpanX: 16,
          trackSpanZ: 24,
        },
        materials: {
          asphaltMat: { tag: 'asphalt' },
          lineMat: { tag: 'line' },
          railPostMat: { tag: 'rail-post' },
        },
      };
    },
    createBoostPad: ({ compiled: boostCompiled, lineMat, world: boostWorld, zipper }) => {
      calls.boostPads.push({ boostCompiled, lineMat, boostWorld, zipper });
      return { tag: `boost-${zipper.key}` };
    },
    createPickups: (pickupArgs) => {
      calls.pickups = pickupArgs;
      return {
        balloonMeshes: [{ tag: 'balloon' }],
        bananaMeshes: [{ tag: 'banana' }],
        flightGateMeshes: [{ tag: 'gate' }],
        switchPadMeshes: [{ tag: 'switch' }],
        trackHazardMeshes: [{ tag: 'hazard' }],
      };
    },
    createScenery: (sceneryArgs) => {
      calls.scenery = sceneryArgs;
      sceneryArgs.collisionCircles.push({ tag: 'collision-circle' });
      calls.registeredCollider = sceneryArgs.registerCameraCollider({ tag: 'camera-collider' });
      const registeredMeshCollider = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 8));
      registeredMeshCollider.position.set(3, 4, 5);
      calls.registeredMeshCollider = sceneryArgs.registerCameraCollider(registeredMeshCollider);
    },
    createVehicles: (vehicleArgs) => {
      calls.vehicles = vehicleArgs;
      return {
        playerVehicle: { tag: 'player-vehicle' },
        rivalModels: [{ tag: 'rival-model' }],
        switchRing: { tag: 'switch-ring' },
      };
    },
  });

  let fallbackUnavailableCalled = false;
  let fallbackTrackCalled = false;
  const fallbackScene = createRaceRuntimeScene({
    canvas,
    compiled,
    race,
    themeByTrack: {
      [compiled.key]: theme,
    },
    createSceneShell: () => ({ camera, scene, world }),
    createRenderer: ({ onUnavailable }) => {
      onUnavailable?.(new Error('expected unavailable'));
      fallbackUnavailableCalled = true;
      return null;
    },
    createTrack: () => {
      fallbackTrackCalled = true;
      return null;
    },
  });

  if (
    runtimeScene.renderer !== renderer ||
    runtimeScene.camera !== camera ||
    runtimeScene.scene !== scene ||
    runtimeScene.world !== world ||
    runtimeScene.theme !== theme ||
    runtimeScene.cleanCityCourse !== true ||
    runtimeScene.bounds.maxX !== 12 ||
    runtimeScene.zipperMeshes.length !== 2 ||
    runtimeScene.zipperMeshes[0].tag !== 'boost-zipper-a' ||
    runtimeScene.balloonMeshes[0].tag !== 'balloon' ||
    runtimeScene.bananaMeshes[0].tag !== 'banana' ||
    runtimeScene.flightGateMeshes[0].tag !== 'gate' ||
    runtimeScene.switchPadMeshes[0].tag !== 'switch' ||
    runtimeScene.trackHazardMeshes[0].tag !== 'hazard' ||
    runtimeScene.playerVehicle.tag !== 'player-vehicle' ||
    runtimeScene.rivalModels[0].tag !== 'rival-model' ||
    runtimeScene.switchRing.tag !== 'switch-ring' ||
    runtimeScene.collisionCircles.length !== 1 ||
    runtimeScene.cameraCollisionObjects[0].tag !== 'camera-collider' ||
    runtimeScene.cameraCollisionObjects[1] !== calls.registeredMeshCollider ||
    Math.abs(runtimeScene.cameraCollisionObjects[1].userData.raceCameraCollider.center.x - 3) > 0.001 ||
    Math.abs(runtimeScene.cameraCollisionObjects[1].userData.raceCameraCollider.center.y - 4) > 0.001 ||
    Math.abs(runtimeScene.cameraCollisionObjects[1].userData.raceCameraCollider.center.z - 5) > 0.001 ||
    runtimeScene.cameraCollisionObjects[1].userData.raceCameraCollider.radius < 5 ||
    calls.sceneTheme !== theme ||
    calls.rendererCanvas !== canvas ||
    calls.rendererUnavailableHandler !== onWebGLUnavailable ||
    calls.track.compiled !== compiled ||
    calls.track.theme !== theme ||
    calls.track.world !== world ||
    calls.boostPads[0].lineMat.tag !== 'line' ||
    calls.boostPads[1].zipper !== race.zippers[1] ||
    calls.pickups.cleanCityCourse !== true ||
    calls.pickups.defaultVehicle !== 'kart' ||
    calls.pickups.race !== race ||
    calls.scenery.visualPalette !== visualPalette ||
    calls.scenery.trackCenterX !== 4 ||
    calls.scenery.trackSpanZ !== 24 ||
    calls.registeredCollider.tag !== 'camera-collider' ||
    calls.vehicles.race !== race ||
    calls.vehicles.defaultVehicle !== 'kart' ||
    fallbackScene.renderer !== null ||
    fallbackScene.theme !== theme ||
    !fallbackUnavailableCalled ||
    fallbackTrackCalled
  ) {
    fail('Race scene runtime helper should preserve scene, renderer, track, pickup, scenery, collider, and vehicle setup', {
      calls,
      fallbackScene,
      fallbackTrackCalled,
      fallbackUnavailableCalled,
      runtimeScene,
    });
  }
};

const validateRaceCameraRuntimeHelpers = () => {
  const camera = { tag: 'camera' };
  const raycaster = { tag: 'raycaster' };
  const cameraCollisionObjects = [{ tag: 'collider' }];
  const compiled = { key: 'camera-runtime-test' };
  const mobilePreset = { baseDistance: 34 };
  const playtest = { enabled: true, visualScenario: 'drift' };
  const player = { vehicleMode: 'hover' };
  const race = { player };
  const vehicles = {
    hover: { label: 'Hover' },
    kart: { label: 'Kart' },
  };
  const visualStats = { cameraClipCount: 0 };
  let mobile = true;
  let reducedMotion = true;
  const calls = [];
  const runtime = createRaceCameraRuntime({
    camera,
    cameraCollisionObjects,
    compiled,
    createRaycaster: () => raycaster,
    getMobile: () => mobile,
    getReducedMotion: () => reducedMotion,
    mobilePreset,
    playtest,
    race,
    updateFrame: (args) => {
      calls.push(args);
      return {
        cameraInitialized: true,
        routeLookahead: {
          call: calls.length,
          seconds: args.mobile ? 1.4 : 1.1,
        },
      };
    },
    useHeadingCameraFor: (candidate) => candidate === playtest,
    vehicles,
    visualStats,
  });

  const initialRouteLookahead = runtime.getRouteLookahead();
  const initialCameraInitialized = runtime.getCameraInitialized();
  const firstFrame = runtime.updateCamera(0.16);
  mobile = false;
  reducedMotion = false;
  player.vehicleMode = 'missing';
  const secondFrame = runtime.updateCamera(0.2);

  if (
    runtime.raycaster !== raycaster ||
    raycaster.camera !== camera ||
    initialRouteLookahead !== null ||
    initialCameraInitialized !== false ||
    firstFrame.routeLookahead.seconds !== 1.4 ||
    secondFrame.routeLookahead.seconds !== 1.1 ||
    runtime.getCameraInitialized() !== true ||
    runtime.getRouteLookahead().call !== 2 ||
    calls.length !== 2 ||
    calls[0].camera !== camera ||
    calls[0].cameraCollisionObjects !== cameraCollisionObjects ||
    calls[0].cameraInitialized !== false ||
    calls[0].collisionStats !== visualStats ||
    calls[0].compiled !== compiled ||
    calls[0].dt !== 0.16 ||
    calls[0].mobile !== true ||
    calls[0].mobilePreset !== mobilePreset ||
    calls[0].player !== player ||
    calls[0].race !== race ||
    calls[0].raycaster !== raycaster ||
    calls[0].reducedMotion !== true ||
    calls[0].useHeadingCamera !== true ||
    calls[0].vehicle !== vehicles.hover ||
    calls[1].cameraInitialized !== true ||
    calls[1].dt !== 0.2 ||
    calls[1].mobile !== false ||
    calls[1].reducedMotion !== false ||
    calls[1].vehicle !== vehicles.kart
  ) {
    fail('Race camera runtime helper should preserve raycaster setup, camera update state, route lookahead storage, and frame argument wiring', {
      calls,
      firstFrame,
      initialCameraInitialized,
      initialRouteLookahead,
      raycaster,
      routeLookahead: runtime.getRouteLookahead(),
      secondFrame,
    });
  }
};

const validateRaceMotionRuntimeHelpers = () => {
  const listeners = [];
  const removed = [];
  const canvas = { dataset: {} };
  const mediaQuery = {
    addEventListener: (type, handler) => listeners.push({ handler, type }),
    matches: false,
    removeEventListener: (type, handler) => removed.push({ handler, type }),
  };
  const runtime = createRaceMotionRuntime({
    canvas,
    reducedMotionSetting: false,
    windowRef: {
      matchMedia: (query) => (query === '(prefers-reduced-motion: reduce)' ? mediaQuery : null),
    },
  });

  const initialReduced = runtime.isReduced();
  const syncReduced = runtime.syncReducedMotion({ matches: true });
  const syncedDataset = canvas.dataset.reducedMotion;
  const syncRestored = runtime.syncReducedMotion({ matches: false });
  runtime.dispose();

  const settingRuntime = createRaceMotionRuntime({
    canvas: { dataset: {} },
    reducedMotionSetting: true,
    windowRef: {
      matchMedia: () => ({ matches: false }),
    },
  });
  const settingReduced = settingRuntime.isReduced();
  settingRuntime.dispose();

  if (
    initialReduced !== false ||
    listeners.length !== 1 ||
    listeners[0].type !== 'change' ||
    syncReduced !== true ||
    syncedDataset !== 'true' ||
    syncRestored !== false ||
    canvas.dataset.reducedMotion !== 'false' ||
    removed.length !== 1 ||
    removed[0].handler !== listeners[0].handler ||
    settingReduced !== true
  ) {
    fail('Race motion runtime should combine settings, media query changes, canvas state, and listener cleanup', {
      canvas,
      initialReduced,
      listeners,
      removed,
      settingReduced,
      syncReduced,
      syncRestored,
      syncedDataset,
    });
  }
};

const validateRaceUpdateRuntimeHelpers = () => {
  const calls = {
    triggers: [],
  };
  const addBoost = () => {};
  const applyItem = () => {};
  const buyDoubleSlot = () => {};
  const buyRareNextPickup = () => {};
  const collectBalloon = () => {};
  const distanceBetween = () => 12;
  const hitPlayer = () => {};
  const hitRival = () => {};
  const nextVehicleMode = () => 'hover';
  const recordPlaytest = () => {};
  const score = () => 99;
  const setVehicleMode = () => {};
  const upgradeHeldItem = () => {};
  const controls = { steer: 0.5, throttle: 1 };
  const touchControls = { accelerate: true, steer: 0.25 };
  const collisionCircles = [{ radius: 3 }];
  const compiled = { key: 'update-runtime-test', laps: 3 };
  const player = { key: 'player' };
  const race = {
    finished: false,
    player,
    time: 9.25,
  };
  const vehicles = {
    kart: { maxSpeed: 58 },
  };
  const runtime = createRaceUpdateRuntime({
    addBoost,
    applyItem,
    applyProgress: (args) => {
      calls.progress = args;
      return { finished: true };
    },
    applyHazardEffectFrame: (args) => {
      calls.hazardEffect = args;
      return { applied: true };
    },
    applyVehicleIntegrationFrame: (args) => {
      calls.vehicleIntegration = args;
      return { integrated: true };
    },
    bounds: { maxX: 10, minX: -10 },
    buyDoubleSlot,
    buyRareNextPickup,
    collectBalloon,
    collisionCircles,
    compiled,
    defaultVehicle: 'kart',
    distanceBetween,
    getControls: () => controls,
    getTouchControls: () => touchControls,
    hitPlayer,
    hitRival,
    kartOnly: true,
    nextVehicleMode,
    playtest: { enabled: true },
    profile: { racerName: 'Update Runtime Test' },
    race,
    recordPlaytest,
    resolveWorldCollisionsFrame: (args) => {
      calls.worldCollision = args;
      return { collided: true };
    },
    score,
    setJumpQueued: (nextJumpQueued) => {
      calls.jumpQueued = nextJumpQueued;
    },
    setVehicleMode,
    triggerHazardTypeFrame: (args) => {
      calls.triggers.push(args);
      return { triggered: true };
    },
    updateAutoplay: (args) => {
      calls.autoplay = args;
      args.applyVehicleIntegration(0.33);
      return { autoplayed: true };
    },
    updatePlayerFrame: (args) => {
      calls.playerFrame = args;
      calls.playerCollisionResult = args.resolveWorldCollisions(player);
      calls.playerLapResult = args.updateLapProgress(player, { progress: 0.9 });
      return { jumpQueued: false };
    },
    updateRankingsFrame: (args) => {
      calls.rankings = args;
    },
    updateRivalsFrame: (args) => {
      calls.rivals = args;
      args.triggerHazardByType('laser', 1.25, 'Zap');
    },
    updateTrackEventsFrame: (args) => {
      calls.trackEvents = args;
    },
    updateTrackHazardsFrame: (args) => {
      calls.trackHazards = args;
      args.applyHazardEffect({ key: 'rival' }, { type: 'wet' }, 0.44);
    },
    upgradeHeldItem,
    vehicles,
    visualStats: { fps: 60 },
  });

  const vehicleIntegrationResult = runtime.applyVehicleIntegration(0.1);
  const autoplayResult = runtime.updateAutoplayPlayer(0.2);
  runtime.updatePlayer(0.16);
  runtime.updateTrackHazards(0.3);
  runtime.updateTrackEvents(0.4);
  const collisionResult = runtime.resolveWorldCollisions({ key: 'external-racer' });
  runtime.triggerHazardByType('gate');
  runtime.updateRivals(0.5);
  runtime.updateRankings();

  if (
    vehicleIntegrationResult?.integrated !== true ||
    autoplayResult?.autoplayed !== true ||
    calls.vehicleIntegration.dt !== 0.33 ||
    calls.vehicleIntegration.compiled !== compiled ||
    calls.vehicleIntegration.distanceBetween !== distanceBetween ||
    calls.vehicleIntegration.hitPlayer !== hitPlayer ||
    calls.vehicleIntegration.kartOnly !== true ||
    calls.vehicleIntegration.playtest.enabled !== true ||
    calls.vehicleIntegration.setVehicleMode !== setVehicleMode ||
    calls.autoplay.applyRaceItem !== applyItem ||
    calls.autoplay.buyDoubleSlot !== buyDoubleSlot ||
    calls.autoplay.buyRareNextPickup !== buyRareNextPickup ||
    calls.autoplay.collectBalloon !== collectBalloon ||
    calls.autoplay.recordPlaytest !== recordPlaytest ||
    calls.autoplay.upgradeHeldItem !== upgradeHeldItem ||
    calls.playerFrame.controls !== controls ||
    calls.playerFrame.touchControls !== touchControls ||
    calls.playerFrame.defaultVehicle !== 'kart' ||
    calls.playerFrame.scoreRacer !== score ||
    calls.playerFrame.vehicles !== vehicles ||
    calls.jumpQueued !== false ||
    calls.progress.nearest.progress !== 0.9 ||
    calls.progress.raceTime !== 9.25 ||
    calls.progress.totalLaps !== 3 ||
    calls.progress.trackLapSplits !== true ||
    calls.playerLapResult.finished !== true ||
    race.finished !== true ||
    calls.playerCollisionResult !== true ||
    collisionResult !== true ||
    calls.worldCollision.collisionCircles !== collisionCircles ||
    calls.worldCollision.vehicleMaxSpeed !== 58 ||
    calls.trackHazards.dt !== 0.3 ||
    calls.hazardEffect.addBoost !== addBoost ||
    calls.hazardEffect.defaultVehicle !== 'kart' ||
    calls.hazardEffect.hitRival !== hitRival ||
    calls.hazardEffect.nextVehicleMode !== nextVehicleMode ||
    calls.hazardEffect.scoreRacer !== score ||
    calls.trackEvents.compiled !== compiled ||
    calls.trackEvents.scoreRacer !== score ||
    calls.triggers.length !== 2 ||
    calls.triggers[0].hazardType !== 'gate' ||
    calls.triggers[0].duration !== 2.4 ||
    calls.triggers[0].message !== null ||
    calls.rivals.defaultVehicle !== 'kart' ||
    calls.rivals.profile.racerName !== 'Update Runtime Test' ||
    calls.rivals.triggerHazardByType === undefined ||
    calls.triggers[1].hazardType !== 'laser' ||
    calls.triggers[1].duration !== 1.25 ||
    calls.triggers[1].message !== 'Zap' ||
    calls.rankings.race !== race
  ) {
    fail('Race update runtime helper should preserve frame callback wiring and runtime side effects', {
      autoplayResult,
      calls,
      collisionResult,
      race,
      vehicleIntegrationResult,
    });
  }
};

const validateRaceVehicleRuntimeHelpers = () => {
  const player = {
    boostSource: null,
    boostTier: 0,
    boostTimer: 0,
    heading: Math.PI / 2,
    invincibleTimer: 0,
    jumpHeight: 0,
    jumpVelocity: 0,
    position: new THREE.Vector3(),
    switchLockedUntil: 0,
    vehicleMode: 'kart',
    velocity: new THREE.Vector3(),
  };
  const rival = {
    boostSource: null,
    boostTier: 0,
    boostTimer: 0,
    heading: 0,
    vehicleMode: 'kart',
    velocity: new THREE.Vector3(),
  };
  const race = {
    player,
    time: 2,
  };
  const stats = {
    boostSeen: false,
    boostSource: null,
    boostSourcesSeen: {},
  };
  const playerBoost = applyRaceBoostRuntime({
    impulse: 12,
    race,
    racer: player,
    seconds: 0.6,
    source: 'drift',
    stats,
    tier: 2,
    vehicles: VEHICLES,
  });
  const rivalBoost = applyRaceBoostRuntime({
    impulse: 8,
    race,
    racer: rival,
    seconds: 0.4,
    source: 'pad',
    stats,
    tier: 1,
    vehicles: VEHICLES,
  });
  if (
    playerBoost?.boostSource !== 'drift' ||
    player.boostTimer !== 0.6 ||
    player.boostTier !== 2 ||
    player.velocity.x <= 0 ||
    !stats.boostSeen ||
    stats.boostSource !== 'drift' ||
    stats.boostSourcesSeen.drift !== 1 ||
    rivalBoost?.boostSource !== 'pad' ||
    stats.boostSourcesSeen.pad
  ) {
    fail('Race vehicle boost runtime should apply boost and record player boost source only', {
      player,
      playerBoost,
      rival,
      rivalBoost,
      stats,
    });
  }

  const cueLog = [];
  const modeLog = [];
  const playerVehicle = {
    setMode(mode) {
      modeLog.push(mode);
    },
  };
  const planeChange = applyRaceVehicleModeRuntime({
    force: true,
    playCue: (cue, volume) => cueLog.push({ cue, volume }),
    playerVehicle,
    race,
    racer: player,
    nextMode: 'plane',
    vehicles: VEHICLES,
  });
  const lockedChange = applyRaceVehicleModeRuntime({
    nextMode: 'hover',
    playCue: (cue, volume) => cueLog.push({ cue, volume }),
    playerVehicle,
    race,
    racer: {
      ...player,
      switchLockedUntil: 5,
      vehicleMode: 'kart',
    },
    vehicles: VEHICLES,
  });
  const kartOnlyChange = applyRaceVehicleModeRuntime({
    force: true,
    kartOnly: true,
    nextMode: 'hover',
    race,
    racer: {
      ...player,
      vehicleMode: 'kart',
    },
    vehicles: VEHICLES,
  });
  if (
    !planeChange.changed ||
    planeChange.nextMode !== 'plane' ||
    player.vehicleMode !== 'plane' ||
    player.flightAltitude !== FLIGHT_ALTITUDE_LIMITS.cruise ||
    player.boostTimer < 0.2 ||
    modeLog[0] !== 'plane' ||
    cueLog[0]?.cue !== 'vehicle-switch' ||
    cueLog[0]?.volume !== 0.16 ||
    lockedChange.changed ||
    lockedChange.reason !== 'switch-locked' ||
    kartOnlyChange.changed ||
    kartOnlyChange.reason !== 'kart-only'
  ) {
    fail('Race vehicle mode runtime should preserve mode change, player presentation, lock, and kart-only behavior', {
      cueLog,
      kartOnlyChange,
      lockedChange,
      modeLog,
      planeChange,
      player,
    });
  }

  const runtimePlayer = {
    boostSource: null,
    boostTier: 0,
    boostTimer: 0,
    heading: 0,
    invincibleTimer: 0,
    jumpHeight: 0,
    jumpVelocity: 0,
    switchLockedUntil: 0,
    vehicleMode: 'kart',
    velocity: new THREE.Vector3(),
  };
  const runtimeRace = {
    player: runtimePlayer,
    time: 4,
  };
  const runtimeStats = {
    boostSeen: false,
    boostSource: null,
    boostSourcesSeen: {},
  };
  const runtimeModeLog = [];
  const vehicleRuntime = createRaceVehicleRuntime({
    playCue: () => {},
    playerVehicle: {
      setMode: (mode) => runtimeModeLog.push(mode),
    },
    race: runtimeRace,
    vehicles: VEHICLES,
    visualStats: runtimeStats,
  });
  const runtimeBoost = vehicleRuntime.addBoost(runtimePlayer, 0.3, 6, 1, 'item');
  const runtimeSwitch = vehicleRuntime.setVehicleMode(runtimePlayer, 'hover', { force: true });
  if (
    vehicleRuntime.nextVehicleMode('kart') !== 'hover' ||
    runtimeBoost?.boostSource !== 'item' ||
    runtimeStats.boostSourcesSeen.item !== 1 ||
    !runtimeSwitch ||
    runtimePlayer.vehicleMode !== 'hover' ||
    runtimeModeLog[0] !== 'hover'
  ) {
    fail('Race vehicle runtime factory should wire boost, vehicle switching, and vehicle order helpers', {
      runtimeBoost,
      runtimeModeLog,
      runtimePlayer,
      runtimeStats,
      runtimeSwitch,
    });
  }
};

const validateRaceDropRuntimeHelpers = () => {
  const world = new THREE.Group();
  const race = {
    droppedBananas: [],
    droppedHazards: [],
  };
  const bananaMeshes = [];
  const trapMeshes = [];
  const material = createDroppedBananaMaterial();
  const racer = {
    bananas: 5,
    heading: Math.PI / 2,
    position: new THREE.Vector3(3, 0, 4),
    velocity: new THREE.Vector3(9, 0, 1),
  };

  const banana = spawnDroppedRaceBanana({
    material,
    meshes: bananaMeshes,
    position: racer.position,
    race,
    velocity: racer.velocity,
    world,
  });
  racer.position.set(30, 0, 40);
  const scatter = scatterDroppedRaceBananas({
    amount: 2,
    material,
    meshes: bananaMeshes,
    race,
    racer,
    world,
  });
  const trap = spawnDroppedRaceTrap({
    itemKey: 'oil',
    level: 2,
    meshes: trapMeshes,
    race,
    racer,
    world,
  });

  const runtime = createRaceDropRuntime({
    droppedBananaMat: material,
    droppedBananaMeshes: bananaMeshes,
    race,
    trapMeshes,
    world,
  });
  const runtimeBanana = runtime.spawnDroppedBanana(new THREE.Vector3(7, 0, 8), new THREE.Vector3(0, 0, -3));
  const runtimeScatter = runtime.scatterBananas(racer, 1);
  const runtimeTrap = runtime.dropTrap(racer, 'oil', 1);

  if (
    banana?.position.x !== 3 ||
    race.droppedBananas.length !== 5 ||
    bananaMeshes.length !== 5 ||
    scatter?.drops.length !== 2 ||
    !trap ||
    race.droppedHazards.length !== 2 ||
    trapMeshes.length !== 2 ||
    !runtimeBanana ||
    runtimeScatter?.drops.length !== 1 ||
    !runtimeTrap ||
    world.children.length !== 7
  ) {
    fail('Race drop runtime should preserve dropped banana, scatter, and trap mesh side effects', {
      banana,
      bananaMeshes: bananaMeshes.length,
      droppedBananas: race.droppedBananas.length,
      droppedHazards: race.droppedHazards.length,
      runtimeBanana,
      runtimeScatter,
      runtimeTrap,
      scatter,
      trap,
      trapMeshes: trapMeshes.length,
      worldChildren: world.children.length,
    });
  }
};

const validateRaceHitRuntimeHelpers = () => {
  const cueLog = [];
  const scatterLog = [];
  const player = {
    hitTimer: 0,
    jumpHeight: 0,
    shieldTimer: 0,
    velocity: new THREE.Vector3(10, 0, 0),
  };
  const race = {
    cameraShakeTimer: 0,
    player,
    screenFlashTimer: 0,
  };
  const hit = applyPlayerHitRuntime({
    playCue: (cue, volume) => cueLog.push({ cue, volume }),
    race,
    scatterBananas: (racer, amount) => {
      scatterLog.push({ amount, racer });
      return { drops: [] };
    },
    severity: 1.2,
  });

  const shieldedRace = {
    cameraShakeTimer: 0,
    player: {
      hitTimer: 0,
      jumpHeight: 0,
      shieldTimer: 2,
      velocity: new THREE.Vector3(10, 0, 0),
    },
    screenFlashTimer: 0,
  };
  const shieldedHit = applyPlayerHitRuntime({
    playCue: (cue, volume) => cueLog.push({ cue, volume }),
    race: shieldedRace,
    scatterBananas: (racer, amount) => scatterLog.push({ amount, racer }),
    severity: 1,
  });

  const rival = {
    hitTimer: 0,
    speed: 30,
  };
  const rivalHit = applyRivalHitRuntime({ rival, severity: 1.1 });
  const factoryCueLog = [];
  const factoryScatterLog = [];
  const factoryRace = {
    cameraShakeTimer: 0,
    player: {
      hitTimer: 0,
      jumpHeight: 0,
      shieldTimer: 0,
      velocity: new THREE.Vector3(8, 0, 0),
    },
    screenFlashTimer: 0,
  };
  const hitRuntime = createRaceHitRuntime({
    playCue: (cue, volume) => factoryCueLog.push({ cue, volume }),
    race: factoryRace,
    scatterBananas: (racer, amount) => factoryScatterLog.push({ amount, racer }),
  });
  const factoryPlayerHit = hitRuntime.hitPlayer(0.8);
  const factoryRival = { hitTimer: 0, speed: 24 };
  const factoryRivalHit = hitRuntime.hitRival(factoryRival, 0.7);

  if (
    !hit.applied ||
    race.cameraShakeTimer !== 0.2 ||
    race.screenFlashTimer !== 0.18 ||
    cueLog.length !== 1 ||
    cueLog[0].cue !== 'item-hit' ||
    cueLog[0].volume !== 0.1 ||
    scatterLog.length !== 1 ||
    scatterLog[0].amount !== 3 ||
    scatterLog[0].racer !== player ||
    player.velocity.length() >= 10 ||
    shieldedHit.applied ||
    shieldedHit.reason !== 'shield-blocked' ||
    shieldedRace.cameraShakeTimer !== 0 ||
    shieldedRace.screenFlashTimer !== 0 ||
    !rivalHit.applied ||
    rival.speed >= 30 ||
    !factoryPlayerHit.applied ||
    factoryCueLog[0]?.cue !== 'item-hit' ||
    factoryScatterLog[0]?.amount !== 3 ||
    !factoryRivalHit.applied ||
    factoryRival.speed >= 24
  ) {
    fail('Race hit runtime should preserve player feedback, shield blocking, rival hits, and factory wiring', {
      cueLog,
      factoryCueLog,
      factoryPlayerHit,
      factoryRival,
      factoryRivalHit,
      factoryScatterLog,
      hit,
      player,
      race,
      rival,
      rivalHit,
      scatterLog,
      shieldedHit,
      shieldedRace,
    });
  }
};

const validateRaceRuntimeActionHelpers = () => {
  const world = new THREE.Group();
  const droppedBananaMeshes = [];
  const trapMeshes = [];
  const cueLog = [];
  const inventoryUses = [];
  const boosts = [];
  const playerVehicle = {
    modes: [],
    setMode(mode) {
      this.modes.push(mode);
    },
  };
  const player = {
    bananas: 3,
    heading: 0,
    heldBalloon: createHeldRaceItem('boost', 1),
    heldItem: createHeldRaceItem('boost', 1),
    hitTimer: 0,
    jumpHeight: 0,
    lap: 1,
    position: new THREE.Vector3(0, 0, 0),
    progress: 0.24,
    secondaryHeldItem: createHeldRaceItem('shield', 1),
    shieldTimer: 0,
    velocity: new THREE.Vector3(12, 0, 0),
    vehicleMode: 'kart',
  };
  const rival = {
    finished: false,
    heading: 0,
    hitTimer: 0,
    lap: 1,
    position: new THREE.Vector3(5, 0, 0),
    progress: 0.27,
    speed: 20,
    vehicleMode: 'kart',
  };
  const race = {
    cameraShakeTimer: 0,
    droppedBananas: [],
    droppedHazards: [],
    eventMessages: [],
    player,
    rivals: [rival],
    screenFlashTimer: 0,
    time: 4.2,
    trackHazards: [
      {
        active: true,
        cooldown: 0,
        eventPulse: 0,
        key: 'near-hazard',
        position: new THREE.Vector3(4, 0, 0),
      },
    ],
  };
  const visualStats = {
    itemBoxPickupDelay: null,
    itemBoxPickupKey: null,
    itemBoxPickupTime: null,
    itemBoxProbeStartTime: 4,
    itemBoxSourceType: null,
  };
  const runtimeActions = createRaceRuntimeActions({
    addBoost: (racer, seconds, impulse, tier, source) => {
      boosts.push({ impulse, racer, seconds, source, tier });
    },
    compiled: {
      key: 'comeback-city',
      pointAt: () => ({
        point: new THREE.Vector3(10, 0, 12),
        tangent: new THREE.Vector3(1, 0, 0),
      }),
      signatureItem: { key: 'boost' },
    },
    defaultVehicle: 'kart',
    distanceBetween: (a, b) => Math.hypot((a?.x || 0) - (b?.x || 0), (a?.z || 0) - (b?.z || 0)),
    droppedBananaMat: createDroppedBananaMaterial(),
    droppedBananaMeshes,
    inventoryRef: { current: { boost: 1, rocket: 0 } },
    kartOnly: false,
    nextVehicleMode: () => 'hover',
    onInventoryUseRef: { current: (type) => inventoryUses.push(type) },
    playCue: (cue, volume) => cueLog.push({ cue, volume }),
    playerVehicle,
    race,
    scoreRacer: (racer) => (racer.lap - 1) + racer.progress,
    setVehicleMode: (racer, nextMode) => {
      racer.vehicleMode = nextMode;
      return true;
    },
    trapMeshes,
    visualStats,
    world,
  });

  const heldUsed = runtimeActions.useHeldBalloon();
  const promotedAfterHeldUse = player.heldItem?.itemKey;
  const bankedUsed = runtimeActions.useBankedItem('boost');
  const bankedBlocked = runtimeActions.useBankedItem('rocket');
  const pickup = runtimeActions.collectBalloon({
    box: { pool: ['boost'] },
    cooldown: 0,
    type: { color: '#2cc8ff', key: 'blue' },
  });
  const droppedTrap = runtimeActions.dropTrap(player, 'oil', 2);
  const remoteHazard = runtimeActions.triggerRemoteHazard(1.3);
  const playerHit = runtimeActions.hitPlayer(1);
  const rivalHit = runtimeActions.hitRival(rival, 1.2);
  const cycled = runtimeActions.cycleVehicle();
  const reset = runtimeActions.resetPlayer();

  if (
    !heldUsed ||
    promotedAfterHeldUse !== 'shield' ||
    !bankedUsed ||
    bankedBlocked ||
    inventoryUses[0] !== 'boost' ||
    !pickup.itemKey ||
    visualStats.itemBoxPickupTime !== 4.2 ||
    race.droppedHazards[0] !== droppedTrap ||
    trapMeshes.length !== 1 ||
    remoteHazard.target?.key !== 'near-hazard' ||
    race.eventMessages.length !== 1 ||
    !playerHit.applied ||
    race.droppedBananas.length !== 3 ||
    droppedBananaMeshes.length !== 3 ||
    !rivalHit.applied ||
    !cycled ||
    player.vehicleMode !== 'hover' ||
    !reset ||
    player.position.x !== 10 ||
    playerVehicle.modes[playerVehicle.modes.length - 1] !== 'hover' ||
    boosts.length < 2 ||
    !cueLog.some((entry) => entry.cue === 'turbo-start') ||
    world.children.length < 4
  ) {
    fail('Race runtime action helper should preserve item use, pickup, trap, hit, vehicle, and reset side effects', {
      bankedBlocked,
      bankedUsed,
      boosts,
      cueLog,
      cycled,
      droppedBananaMeshes: droppedBananaMeshes.length,
      droppedTrap,
      eventMessages: race.eventMessages,
      heldItem: player.heldItem,
      heldUsed,
      inventoryUses,
      pickup,
      playerHit,
      playerPosition: player.position,
      playerVehicleModes: playerVehicle.modes,
      promotedAfterHeldUse,
      remoteHazard,
      reset,
      rivalHit,
      trapMeshes: trapMeshes.length,
      visualStats,
      worldChildren: world.children.length,
    });
  }
};

const validateRacePlaytestStateHelpers = () => {
  const defaultPlaytest = createRacePlaytestState('');
  const visualPlaytest = createRacePlaytestState(
    '?raceAutoplay=1&raceMode=visual-kart&raceIndex=7&raceVisualScenario=drift-mechanics&raceHideMinimap=1'
  );
  const productionQueryPlaytest = createRacePlaytestState(
    '?raceAutoplay=1&raceMode=visual-kart&raceIndex=7&raceVisualScenario=drift-mechanics&raceNoFinish=1',
    { hooksEnabled: false }
  );
  if (
    defaultPlaytest.enabled ||
    defaultPlaytest.mode !== 'free-switch' ||
    defaultPlaytest.hideMinimap ||
    defaultPlaytest.raceIndex !== 1 ||
    defaultPlaytest.visualScenario !== 'driving' ||
    defaultPlaytest.bananaMax !== 0 ||
    defaultPlaytest.started ||
    defaultPlaytest.signatureUsed ||
    defaultPlaytest.layers.size !== 0 ||
    defaultPlaytest.vehicles.size !== 0 ||
    !visualPlaytest.enabled ||
    visualPlaytest.mode !== 'visual-kart' ||
    visualPlaytest.raceIndex !== 7 ||
    visualPlaytest.visualScenario !== 'drift-mechanics' ||
    !visualPlaytest.hideMinimap ||
    visualPlaytest.itemUses !== 0 ||
    visualPlaytest.switchPads !== 0 ||
    visualPlaytest.zones !== 0 ||
    productionQueryPlaytest.enabled ||
    productionQueryPlaytest.mode !== 'disabled' ||
    productionQueryPlaytest.hideMinimap ||
    productionQueryPlaytest.noFinish ||
    productionQueryPlaytest.raceIndex !== 0 ||
    productionQueryPlaytest.visualScenario !== 'driving'
  ) {
    fail('Race playtest state helper should preserve URL parsing defaults, hook-disable behavior, and mutable counter/set fields', {
      defaultPlaytest,
      productionQueryPlaytest,
      visualPlaytest,
    });
  }

  const windowRef = {
    __racePlaytestEvents: [{ stale: true }],
    __racePlaytestResult: { stale: true },
    __raceVisualTelemetry: { stale: true },
    __raceVisualTelemetrySamples: [{ stale: true }],
  };
  resetRacePlaytestGlobals({ playtest: visualPlaytest, windowRef });
  const event = recordRacePlaytestEvent({
    compiled: { key: 'comeback-city' },
    detail: { itemKey: 'boost' },
    playtest: visualPlaytest,
    race: { time: 1.25 },
    type: 'item-use',
    windowRef,
  });
  const disabledWindowRef = { __racePlaytestEvents: [] };
  const disabledEvent = recordRacePlaytestEvent({
    compiled: { key: 'comeback-city' },
    playtest: defaultPlaytest,
    race: { time: 2 },
    type: 'ignored',
    windowRef: disabledWindowRef,
  });
  if (
    windowRef.__racePlaytestEvents.length !== 1 ||
    windowRef.__racePlaytestResult !== null ||
    windowRef.__raceVisualTelemetry !== null ||
    windowRef.__raceVisualTelemetrySamples.length !== 0 ||
    event !== windowRef.__racePlaytestEvents[0] ||
    event.mode !== 'visual-kart' ||
    event.raceIndex !== 7 ||
    event.time !== 1.25 ||
    event.trackKey !== 'comeback-city' ||
    event.type !== 'item-use' ||
    event.itemKey !== 'boost' ||
    disabledEvent !== null ||
    disabledWindowRef.__racePlaytestEvents.length !== 0
  ) {
    fail('Race playtest recorder should reset enabled globals, append event metadata, and ignore disabled playtests', {
      disabledEvent,
      disabledWindowRef,
      event,
      windowRef,
    });
  }

  const inactiveWindowRef = { __raceVisualTelemetry: { stale: true } };
  resetRacePlaytestGlobals({ playtest: defaultPlaytest, windowRef: inactiveWindowRef });
  if (
    inactiveWindowRef.__raceVisualTelemetry !== null ||
    Object.prototype.hasOwnProperty.call(inactiveWindowRef, '__racePlaytestEvents') ||
    Object.prototype.hasOwnProperty.call(inactiveWindowRef, '__racePlaytestResult') ||
    Object.prototype.hasOwnProperty.call(inactiveWindowRef, '__raceVisualTelemetrySamples')
  ) {
    fail('Race playtest global reset should clear visual telemetry without creating playtest globals when disabled', {
      inactiveWindowRef,
    });
  }

  const createAutoplayPlayer = () => ({
    bananas: 0,
    bestLap: null,
    blindTimer: 1,
    boostSource: null,
    boostTier: 0,
    boostTimer: 0,
    controlFlipTimer: 1,
    doubleSlotUses: 0,
    driftActive: false,
    driftCharge: 0,
    driftDirection: 0,
    flightAltitude: 0,
    flightPitch: 0,
    flightRoll: 0,
    ghostTimer: 1,
    heldBalloon: null,
    heldItem: null,
    invincibleTimer: 1,
    jumpHeight: 0,
    lap: 1,
    lapSplits: [],
    lapStartTime: 0,
    liftDisabledTimer: 1,
    lightningRodTimer: 1,
    magnetTimer: 1,
    planeBob: 0,
    polaritySwapTimer: 1,
    position: new THREE.Vector3(),
    progress: 0.99,
    rareNextPickup: false,
    shieldTimer: 1,
    steerInput: 0,
    transformTimer: 1,
    vehicleMode: 'kart',
    velocity: new THREE.Vector3(),
  });
  const autoplayCompiled = {
    cameraCheckpoints: [
      { key: 'branch-food', progress: 0.245, visibleBranchKey: 'garage-shortcut' },
      { key: 'camera-near-lab', progress: 0.56 },
    ],
    key: 'comeback-city',
    laps: 3,
    roadWidth: 12,
    routeLayers: {
      air: { vehiclePreference: 'plane' },
      ground: { vehiclePreference: 'kart' },
      hybrid: { vehiclePreference: 'hover' },
    },
    signatureItem: { key: 'boost' },
    startProgress: 0.012,
    totalLength: 480,
    vehicleLocks: [{ end: 0.03, start: 0.96 }],
    vehicleZones: [{ progress: 0.05 }],
    pointAt(progress) {
      return {
        point: new THREE.Vector3(progress * 100, 0, progress * 50),
        progress,
        tangent: new THREE.Vector3(0, 0, 1),
      };
    },
  };
  const createAutoplayRace = (overrides = {}) => ({
    balloons: [{ cooldown: 0, position: new THREE.Vector3(4, 0, 4), progress: 0.05 }],
    bananas: [{ cooldown: 0, progress: 0.085 }],
    finished: false,
    player: createAutoplayPlayer(),
    switchPads: [{ progress: 0.05 }],
    time: 2.1,
    trackHazards: [{ active: true, progress: 0.05 }],
    ...overrides,
  });
  const createAutoplayPlaytest = (overrides = {}) => ({
    bananaMax: 0,
    enabled: true,
    hazardsEncountered: 0,
    itemBoxesCollected: 0,
    itemUses: 0,
    layers: new Set(),
    locks: 0,
    mode: 'free-switch',
    signatureUsed: false,
    started: false,
    switchPads: 0,
    upgrades: 0,
    vehicles: new Set(),
    visualScenario: 'driving',
    zones: 0,
    ...overrides,
  });
  const visualAutoplayRace = createAutoplayRace({ player: { ...createAutoplayPlayer(), progress: 0.1 }, time: 0.5 });
  const visualAutoplayPlaytest = createAutoplayPlaytest({ mode: 'visual-kart', visualScenario: 'boost' });
  const visualAutoplayStats = { boostSourcesSeen: {}, driftStartCount: 0, driftTierSeen: 0 };
  const visualAutoplayEvents = [];
  let visualAutoplayIntegrationCount = 0;
  updateRaceAutoplayPlayer({
    applyVehicleIntegration: () => {
      visualAutoplayIntegrationCount += 1;
    },
    buyDoubleSlot: () => {
      visualAutoplayRace.player.doubleSlotUses += 1;
    },
    buyRareNextPickup: () => {
      visualAutoplayRace.player.rareNextPickup = true;
    },
    compiled: autoplayCompiled,
    dt: 0.1,
    playtest: visualAutoplayPlaytest,
    race: visualAutoplayRace,
    recordPlaytest: (type, detail) => visualAutoplayEvents.push({ detail, type }),
    setVehicleMode: (racer, mode) => {
      racer.vehicleMode = mode;
    },
    upgradeHeldItem: () => {
      visualAutoplayRace.player.heldItem.level += 1;
    },
    visualStats: visualAutoplayStats,
  });
  const nonVisualRace = createAutoplayRace();
  const nonVisualPlaytest = createAutoplayPlaytest();
  const nonVisualStats = { boostSourcesSeen: {}, driftStartCount: 0, driftTierSeen: 0 };
  const nonVisualEvents = [];
  const nonVisualItemUses = [];
  let nonVisualCollectCount = 0;
  let nonVisualIntegrationCount = 0;
  updateRaceAutoplayPlayer({
    applyRaceItem: (_racer, item, level) => {
      nonVisualItemUses.push({ itemKey: item?.itemKey || item?.key, level });
      return true;
    },
    applyVehicleIntegration: () => {
      nonVisualIntegrationCount += 1;
    },
    buyDoubleSlot: () => {
      nonVisualRace.player.doubleSlotUses += 1;
    },
    buyRareNextPickup: () => {
      nonVisualRace.player.rareNextPickup = true;
    },
    collectBalloon: () => {
      nonVisualCollectCount += 1;
      nonVisualRace.player.heldItem = { itemKey: 'shield', level: 1 };
      nonVisualRace.player.heldBalloon = nonVisualRace.player.heldItem;
    },
    compiled: autoplayCompiled,
    dt: 0.1,
    playtest: nonVisualPlaytest,
    race: nonVisualRace,
    recordPlaytest: (type, detail) => nonVisualEvents.push({ detail, type }),
    setVehicleMode: (racer, mode) => {
      racer.vehicleMode = mode;
    },
    upgradeHeldItem: () => {
      nonVisualRace.player.heldItem.level += 1;
    },
    visualStats: nonVisualStats,
  });
  if (
    !visualAutoplayPlaytest.started ||
    visualAutoplayRace.player.vehicleMode !== 'kart' ||
    visualAutoplayRace.player.bananas !== 0 ||
    visualAutoplayRace.player.heldItem?.itemKey !== 'boost' ||
    visualAutoplayRace.player.boostSource !== 'pad' ||
    visualAutoplayRace.player.boostTimer <= 0 ||
    visualAutoplayStats.boostSource !== 'pad' ||
    !visualAutoplayPlaytest.layers.has('ground') ||
    !visualAutoplayPlaytest.vehicles.has('kart') ||
    visualAutoplayIntegrationCount !== 1 ||
    visualAutoplayEvents.map((event) => event.type).join(',') !== 'start,banana-upgrades' ||
    !nonVisualPlaytest.started ||
    !nonVisualPlaytest.signatureUsed ||
    nonVisualPlaytest.itemUses !== 2 ||
    nonVisualPlaytest.itemBoxesCollected !== 1 ||
    nonVisualCollectCount !== 1 ||
    nonVisualItemUses.length !== 2 ||
    nonVisualPlaytest.bananaMax < 16 ||
    nonVisualPlaytest.hazardsEncountered <= 0 ||
    nonVisualPlaytest.locks !== 1 ||
    nonVisualPlaytest.switchPads !== 1 ||
    nonVisualPlaytest.zones !== 1 ||
    nonVisualRace.player.lap !== 2 ||
    nonVisualRace.player.bestLap === null ||
    nonVisualRace.player.bananas < 16 ||
    nonVisualRace.player.boostTimer !== 0 ||
    nonVisualRace.player.blindTimer >= 1 ||
    nonVisualIntegrationCount !== 1 ||
    !nonVisualEvents.some((event) => event.type === 'signature-item') ||
    !nonVisualEvents.some((event) => event.type === 'item-box') ||
    !nonVisualEvents.some((event) => event.type === 'item-use') ||
    !nonVisualEvents.some((event) => event.type === 'lap')
  ) {
    fail('Race autoplay helper should preserve visual and non-visual browser playtest behavior', {
      nonVisualCollectCount,
      nonVisualEvents,
      nonVisualIntegrationCount,
      nonVisualItemUses,
      nonVisualPlaytest,
      nonVisualRace,
      visualAutoplayEvents,
      visualAutoplayIntegrationCount,
      visualAutoplayPlaytest,
      visualAutoplayRace,
      visualAutoplayStats,
    });
  }
};

const validateTrack = (track) => {
  const expected = REQUIRED_TRACKS[track.key];
  if (!expected) fail('Unexpected track key', { key: track.key });
  if (track.laps !== 3) fail('Track must be 3 laps', { key: track.key, laps: track.laps });
  if (track.bananaCount !== expected.bananaCount) {
    fail('Track banana count mismatch', { actual: track.bananaCount, expected: expected.bananaCount, key: track.key });
  }
  if (track.signatureItem?.key !== expected.signature) fail('Signature item mismatch', { key: track.key });
  if (!getItemDefinition(track.signatureItem.key)) fail('Missing signature item definition', { key: track.key });
  if (!itemAllowedOnTrack(getItemDefinition(track.signatureItem.key), track.key)) {
    fail('Signature item is not allowed on its track', { key: track.key, signature: track.signatureItem.key });
  }

  if (expected.kartOnly) validateComebackCityV2(track);

  Object.keys(expected.itemBoxes).forEach((layerKey) => {
    const layer = track.layers?.[layerKey];
    if (!layer) fail('Missing route layer', { key: track.key, layerKey });
    const expectedCount = expected.itemBoxes[layerKey];
    if ((layer.itemBoxes || []).length !== expectedCount) {
      fail('Unexpected item box count', {
        actual: (layer.itemBoxes || []).length,
        expected: expectedCount,
        key: track.key,
        layerKey,
      });
    }
  });

  if (!expected.kartOnly && !track.switchPads?.length) fail('Missing switch pads', { key: track.key });
  if (!expected.kartOnly && !track.vehicleZones?.length) fail('Missing vehicle zones', { key: track.key });
  if (!expected.kartOnly && !track.vehicleLocks?.length) fail('Missing vehicle locks', { key: track.key });
  if (!track.events?.length) fail('Missing dynamic events', { key: track.key });

  const hazardTypes = new Set((track.hazards || []).map((hazard) => hazard.type));
  const missingHazards = expected.hazards.filter((hazard) => !hazardTypes.has(hazard));
  if (missingHazards.length) fail('Missing required hazards', { key: track.key, missingHazards });
};

const simulateRace = (track, raceIndex, mode) => {
  const racers = [
    { finished: false, key: 'player', lap: 1, progress: track.startProgress || 0, speed: 1 + raceIndex * 0.035, vehicle: 'kart' },
    ...(track.aiRivals || []).map((rival, index) => ({
      finished: false,
      key: rival.name,
      lap: 1,
      progress: ((track.startProgress || 0) - 0.035 * (index + 1) + 1) % 1,
      speed: 0.96 + index * 0.025 + (raceIndex === index ? 0.09 : 0),
      vehicle: index === 0 ? 'plane' : 'kart',
    })),
  ];

  const finishOrder = [];
  for (let tick = 0; tick < 2400 && finishOrder.length < racers.length; tick += 1) {
    racers.forEach((racer) => {
      if (racer.finished) return;
      const previous = racer.progress;
      const zones = track.vehicleZones || [];
      zones.forEach((zone) => {
        if (zone.active === false) return;
        const gap = Math.abs(zone.progress - racer.progress);
        if (gap < 0.025 && mode === 'vehicle-restricted') racer.vehicle = zone.vehicle;
      });
      (track.vehicleLocks || []).forEach((lock) => {
        if (progressInRange(racer.progress, lock.start, lock.end) && lock.vehicle) racer.vehicle = lock.vehicle;
      });
      racer.progress = (racer.progress + 0.006 * racer.speed) % 1;
      if (previous > 0.88 && racer.progress < 0.16) {
        racer.lap += 1;
        if (racer.lap > track.laps) {
          racer.finished = true;
          finishOrder.push(racer.key);
        }
      }
    });
  }

  if (finishOrder.length !== racers.length) fail('Race simulation softlocked', { finishOrder, mode, raceIndex, track: track.key });
  return finishOrder;
};

// Kart-vs-kart contact (shipped V2 kart runtime, rivalRacers.js): overlap
// separation runs every frame (the render-through fix), a square rear hit
// from a clearly faster kart spins the front kart (symmetric — the player
// spins too), slow/glancing contact stays a plain bump, and airborne karts
// skip contact entirely.
const validateKartContactHelpers = () => {
  const makeContactCtx = (player = {}) => ({
    boostPads: [],
    boostSpeed: 284,
    cornerPushFor: () => 0,
    curvatureAt: () => 0,
    dt: 1 / 60,
    finalLap: false,
    laneScale: 24,
    maxSpeed: 228,
    player: {
      airborne: false,
      aurora: false,
      bumpCooldown: 0,
      lane: -0.9,
      progress: 0.5,
      speed: 0,
      spinning: false,
      total: 0.5,
      ...player,
    },
    raceTime: 0,
    trackLength: 2900,
    wallLane: 0.95,
  });
  const makePair = () => {
    const field = createRivalRacers(
      [
        { lane: 0, name: 'Blue Speed' },
        { lane: 0, name: 'Purple Lab' },
      ],
      { gridProgress: 0.3 }
    );
    field.forEach((rival) => {
      rival.lane = 0;
      rival.previousProgress = 0.3;
      rival.progress = 0.3;
      rival.speed = 150;
    });
    return field;
  };

  // 1) Separation: overlapping karts slide apart even while bump cooldowns
  //    are hot — impulses are gated, separation never is.
  const sepField = makePair();
  sepField[0].lane = 0.02;
  sepField[0].bumpCooldown = 0.7;
  sepField[1].bumpCooldown = 0.7;
  const sepBefore = sepField[0].lane - sepField[1].lane;
  updateRivalRacers(sepField, makeContactCtx());
  const sepAfter = sepField[0].lane - sepField[1].lane;

  // 2) Rear-hit spin-out between rivals: fast kart square behind spins the
  //    slower front kart; the attacker keeps nearly all its speed.
  const spinField = makePair();
  spinField[0].speed = 220;
  spinField[1].previousProgress = 0.3 + 6 / 2900;
  spinField[1].progress = 0.3 + 6 / 2900;
  spinField[1].speed = 90;
  updateRivalRacers(spinField, makeContactCtx());

  // 3) Symmetric: a clearly faster rival square behind the player reports a
  //    player spin (the caller applies shield/aurora rules).
  const playerField = makePair();
  playerField[0].previousProgress = 0.5 - 6 / 2900;
  playerField[0].progress = 0.5 - 6 / 2900;
  playerField[0].speed = 210;
  playerField[1].previousProgress = 0.9;
  playerField[1].progress = 0.9;
  const playerResult = updateRivalRacers(
    playerField,
    makeContactCtx({ lane: 0, progress: 0.5, speed: 80, total: 0.5 })
  );

  // 4) Below the closing-speed threshold the same geometry is a plain bump.
  const bumpField = makePair();
  bumpField[0].speed = 130;
  bumpField[1].previousProgress = 0.3 + 6 / 2900;
  bumpField[1].progress = 0.3 + 6 / 2900;
  bumpField[1].speed = 110;
  updateRivalRacers(bumpField, makeContactCtx());

  // 5) Airborne karts fly over contact entirely.
  const airField = makePair();
  airField[0].speed = 220;
  airField[1].air.airborne = true;
  airField[1].air.height = 3;
  airField[1].previousProgress = 0.3 + 6 / 2900;
  airField[1].progress = 0.3 + 6 / 2900;
  airField[1].speed = 90;
  updateRivalRacers(airField, makeContactCtx());

  // 6) An airborne PLAYER (ballistic or shortcut flight — the caller ORs
  //    race.shortcut.active into ctx.player.airborne) reports no contact.
  const flightField = makePair();
  flightField[0].previousProgress = 0.5 - 6 / 2900;
  flightField[0].progress = 0.5 - 6 / 2900;
  flightField[0].speed = 210;
  flightField[1].previousProgress = 0.9;
  flightField[1].progress = 0.9;
  const flightResult = updateRivalRacers(
    flightField,
    makeContactCtx({ airborne: true, lane: 0, progress: 0.5, speed: 80, total: 0.5 })
  );

  const fieldsFinite = [sepField, spinField, playerField, bumpField, airField].every((field) =>
    field.every((rival) => Number.isFinite(rival.lane) && Number.isFinite(rival.speed))
  );
  if (
    // Autoplay-protecting invariant: a boosted rival (BOOST_SPEED 284) must
    // NOT clear the rear-hit differential against the slowest cruising kart
    // (MAX_SPEED 228 * worst topSpeed 0.96) — the kart-playable proof's
    // instant speed floors depend on it.
    !(KART_CONTACT.spinSpeedDiff > 284 - 228 * 0.96) ||
    !(sepAfter > sepBefore + 0.02) ||
    !(spinField[1].spinTimer > 0) ||
    !(spinField[1].speed <= 90 * KART_CONTACT.spinSpeedScale + 8) ||
    spinField[0].spinTimer !== 0 ||
    !(spinField[0].speed > 200) ||
    spinField[0].bumpCooldown !== KART_CONTACT.spinCooldown ||
    playerResult.playerSpin !== true ||
    !playerResult.playerBump ||
    playerResult.playerBump.speedScale !== 1 ||
    playerResult.playerNudgeLane === 0 ||
    bumpField[1].spinTimer !== 0 ||
    bumpField[0].bumpCooldown !== KART_CONTACT.bumpCooldown ||
    airField[1].spinTimer !== 0 ||
    airField[1].bumpCooldown !== 0 ||
    flightResult.playerSpin !== false ||
    flightResult.playerBump !== null ||
    flightResult.playerNudgeLane !== 0 ||
    !fieldsFinite
  ) {
    fail('Kart contact should separate overlaps, spin square rear hits both ways, keep slow contact a bump, and skip airborne karts', {
      airCooldown: airField[1].bumpCooldown,
      airSpin: airField[1].spinTimer,
      attackerCooldown: spinField[0].bumpCooldown,
      attackerSpeed: spinField[0].speed,
      attackerSpin: spinField[0].spinTimer,
      bumpCooldown: bumpField[0].bumpCooldown,
      bumpSpin: bumpField[1].spinTimer,
      fieldsFinite,
      flightBump: flightResult.playerBump,
      flightNudge: flightResult.playerNudgeLane,
      flightSpin: flightResult.playerSpin,
      playerBump: playerResult.playerBump,
      playerNudgeLane: playerResult.playerNudgeLane,
      playerSpin: playerResult.playerSpin,
      spinSpeedDiff: KART_CONTACT.spinSpeedDiff,
      sepAfter,
      sepBefore,
      victimSpeed: spinField[1].speed,
      victimSpin: spinField[1].spinTimer,
    });
  }
};

// B2 palette moments (shipped V2 kart runtime, paletteMoments.js): a
// moment-less palette resolves to null (Comeback City's untouched-by-
// construction guarantee), sparse moments fill every endpoint from the
// palette base, fog.far clamps to 840 (camera far 860 no-ops beyond),
// sampling is exact at moment boundaries, smoothstep-eased mid-segment,
// allocation-free, and the last->first wrap segment converges on the first
// moment from both sides so the lap seam (0.95 -> 0.05) cannot color-pop.
const validatePaletteMomentHelpers = () => {
  const hex01 = (hex) => ({
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  });
  const colorsClose = (a, b, epsilon = 1e-9) =>
    Math.abs(a.r - b.r) <= epsilon && Math.abs(a.g - b.g) <= epsilon && Math.abs(a.b - b.b) <= epsilon;
  const close = (a, b, epsilon = 1e-9) => Math.abs(a - b) <= epsilon;
  // Penguin Village's landed B1 V8 + B3 V6 palette shape.
  const palette = {
    fog: { color: '#4a6478', near: 150, far: 680 },
    hemi: { sky: '#689bb8', ground: '#0f273f', intensity: 3 },
    sunColor: '#e8c9a0',
    rimLightColor: '#00d5ff',
    heroRim: { power: 2.6, strength: 0.32, tint: '#eaf6ff' },
  };

  // 1) Null paths: no moments key / empty array — the per-frame hook's
  //    single truthy check rides on this.
  const nullResolved = resolveMoments(palette);
  const emptyResolved = resolveMoments({ ...palette, moments: [] });

  // 2) Base fill: a bare moment inherits every endpoint from the palette
  //    (fog/hemi/sun colors decoded to sRGB triples, sun intensity from the
  //    createScene DirectionalLight, rimTint from heroRim.tint — NOT the
  //    rimLight color); unsorted input sorts by progress; fog.far clamps.
  const resolved = resolveMoments(
    {
      ...palette,
      moments: [
        { progress: 0.84, fog: { near: 120 }, sun: { intensity: 2.2 } },
        { progress: 0.02 },
        { progress: 0.3, fog: { far: 900 } },
        { progress: 0.55, sun: { color: '#f0b070' } },
      ],
    },
    { rimTint: '#eaf6ff' }
  );
  const first = resolved[0];
  const baseFilled =
    colorsClose(first.fogColor, hex01('#4a6478')) &&
    first.fogNear === 150 &&
    first.fogFar === 680 &&
    colorsClose(first.hemiSky, hex01('#689bb8')) &&
    colorsClose(first.hemiGround, hex01('#0f273f')) &&
    colorsClose(first.sunColor, hex01('#e8c9a0')) &&
    first.sunIntensity === 2.6 &&
    colorsClose(first.rim, hex01('#00d5ff')) &&
    colorsClose(first.rimTint, hex01('#eaf6ff')) &&
    first.bloom === 1;
  const sortedByProgress = resolved.every(
    (moment, index) => index === 0 || resolved[index - 1].progress <= moment.progress
  );

  // 3) Boundary + mid-segment easing: exactly on a moment t is 0; halfway
  //    between two moments smoothstep(0.5) = 0.5; quarter-way eases to
  //    smoothstep(0.25) = 0.15625.
  const sample = createMomentSample();
  const atBoundary = sampleMoments(resolved, 0.02, sample);
  const boundaryExact =
    atBoundary === sample && atBoundary.segment === 0 && atBoundary.t === 0 && atBoundary.fogNear === 150;
  // Segment 0.02 -> 0.30 (fogNear 150 both, fogFar 680 -> 840): midpoint.
  sampleMoments(resolved, 0.16, sample);
  const midEased = close(sample.t, 0.5) && close(sample.fogFar, (680 + 840) / 2);
  sampleMoments(resolved, 0.09, sample);
  const quarterEased = close(sample.t, 0.15625) && close(sample.fogFar, 680 + (840 - 680) * 0.15625);

  // 4) Wrap seam: the 0.84 -> 0.02 segment spans the lap boundary. Sampling
  //    at 0.95 sits inside it; approaching 0.02 from below (0.0199…) must
  //    converge on the first moment's exact values (no pop at the finish
  //    line), and 0.05-style early progress still belongs to segment 0's
  //    start only AFTER the first moment — before it, it is the wrap tail.
  sampleMoments(resolved, 0.95, sample);
  const wrapRaw = (0.95 - 0.84) / (0.02 - 0.84 + 1);
  const wrapEase = wrapRaw * wrapRaw * (3 - 2 * wrapRaw);
  const wrapMid =
    sample.segment === resolved.length - 1 &&
    close(sample.t, wrapEase) &&
    close(sample.fogNear, 120 + (150 - 120) * wrapEase) &&
    close(sample.sunIntensity, 2.2 + (2.6 - 2.2) * wrapEase);
  sampleMoments(resolved, 0.0199999, sample);
  const seamConverges =
    sample.segment === resolved.length - 1 &&
    close(sample.fogNear, 150, 1e-4) &&
    close(sample.sunIntensity, 2.6, 1e-6) &&
    colorsClose(sample.fogColor, hex01('#4a6478'), 1e-6);

  // 5) Zero allocations: repeated samples reuse the same scratch object and
  //    its nested color triples.
  const fogColorRef = sample.fogColor;
  const rimTintRef = sample.rimTint;
  const reused =
    sampleMoments(resolved, 0.5, sample) === sample &&
    sample.fogColor === fogColorRef &&
    sample.rimTint === rimTintRef;

  // 6) Single-moment sets are constant everywhere (wrap segment with
  //    identical endpoints), so a one-moment palette can never flicker.
  const single = resolveMoments({ ...palette, moments: [{ progress: 0.3, fog: { near: 100 } }] });
  const singleSample = createMomentSample();
  sampleMoments(single, 0.1, singleSample);
  const singleLow = singleSample.fogNear;
  sampleMoments(single, 0.9, singleSample);
  const singleConstant = singleLow === 100 && singleSample.fogNear === 100;

  if (
    nullResolved !== null ||
    emptyResolved !== null ||
    resolved.length !== 4 ||
    !baseFilled ||
    !sortedByProgress ||
    resolved[1].fogFar !== 840 ||
    !boundaryExact ||
    !midEased ||
    !quarterEased ||
    !wrapMid ||
    !seamConverges ||
    !reused ||
    !singleConstant
  ) {
    fail('Palette moments should fill from base, clamp fog.far, ease segments, and stay seam-continuous across the lap wrap', {
      baseFilled,
      boundaryExact,
      emptyResolved,
      fogFarClamped: resolved[1].fogFar,
      midEased,
      nullResolved,
      quarterEased,
      resolvedLength: resolved.length,
      reused,
      seamConverges,
      seamFogNear: sample.fogNear,
      singleConstant,
      sortedByProgress,
      wrapMid,
      wrapT: wrapEase,
    });
  }
};

// W2 item audit: every held item's PURE semantics proven in node. The JSX
// wiring (spin/boost/shield application, aurora immunity, avalanche bury)
// was read-audited the same day — see the roadmap W2 record.
const validateHeldItemHelpers = () => {
  const TRACK_LENGTH = 3000;

  // -- pickup tables: comeback tiering, determinism, ultimates gate --------
  ITEM_KEYS.forEach((key) => {
    if (!ITEM_LABELS[key]) fail('held item missing HUD label', { key });
  });
  for (let position = 0; position <= 5; position += 1) {
    for (let boxIndex = 0; boxIndex < 6; boxIndex += 1) {
      for (const finalLap of [false, true]) {
        const pick = itemForPickup(boxIndex, 2, position, finalLap);
        if (!ITEM_KEYS.includes(pick)) fail('itemForPickup returned unknown key', { boxIndex, finalLap, pick, position });
        if (pick !== itemForPickup(boxIndex, 2, position, finalLap)) fail('itemForPickup not deterministic', { boxIndex, position });
      }
    }
  }
  const leaderPicks = new Set([0, 1, 2, 3].map((boxIndex) => itemForPickup(boxIndex, 1, 1, false)));
  if (![...leaderPicks].every((pick) => pick === 'fishbone' || pick === 'iceshield')) {
    fail('P1 table must be defense-only', { leaderPicks: [...leaderPicks] });
  }
  const ultimatePicks = new Set([0, 1, 2, 3].map((boxIndex) => itemForPickup(boxIndex, 3, 4, true)));
  if (!ultimatePicks.has('avalanche') || !ultimatePicks.has('aurora') || !ultimatePicks.has('march')) {
    fail('P4 final lap must reach the ultimates', { ultimatePicks: [...ultimatePicks] });
  }
  const nonFinalP4 = new Set([0, 1, 2, 3].map((boxIndex) => itemForPickup(boxIndex, 1, 4, false)));
  if (nonFinalP4.has('avalanche') || nonFinalP4.has('aurora') || nonFinalP4.has('march')) {
    fail('ultimates leaked outside P4 final lap', { nonFinalP4: [...nonFinalP4] });
  }

  // -- fish bone: drop-back, cap, grace, ARM DELAY --------------------------
  const bones = createFishBoneField();
  dropFishBone(bones, 'player', 0.5, 0.2, TRACK_LENGTH);
  if (bones.length !== 1) fail('fish bone did not drop', { count: bones.length });
  const dropBack = (0.5 - bones[0].progress) * TRACK_LENGTH;
  if (Math.abs(dropBack - ITEM_FEEL.fishBoneDropBack) > 0.01) {
    fail('fish bone drop-back wrong', { dropBack });
  }
  // arm delay: a FRESH bone must hit NOBODY (not even non-owners)...
  if (fishBoneHitFor(bones, 'rival-a', bones[0].progress, 0.2, TRACK_LENGTH)) {
    fail('fresh fish bone hit inside the arm delay (unreactable point-blank)');
  }
  // ...but arms after fishBoneArmDelay seconds...
  ageFishBones(bones, ITEM_FEEL.fishBoneArmDelay + 0.01);
  const armedHit = fishBoneHitFor(bones, 'rival-a', bones[0].progress, 0.2, TRACK_LENGTH);
  if (!armedHit) fail('armed fish bone did not hit a non-owner in the window');
  if (bones.length !== 0) fail('fish bone not consumed on hit', { count: bones.length });
  // ...the owner stays immune for the full grace, then their own bone bites.
  dropFishBone(bones, 'player', 0.5, 0.2, TRACK_LENGTH);
  ageFishBones(bones, 1.3);
  if (fishBoneHitFor(bones, 'player', bones[0].progress, 0.2, TRACK_LENGTH)) {
    fail('owner hit their own bone inside the grace window');
  }
  ageFishBones(bones, 0.2);
  if (!fishBoneHitFor(bones, 'player', bones[0].progress, 0.2, TRACK_LENGTH)) {
    fail('owner immune to their own bone after grace expired');
  }
  // lane window: a bone one lane-widths off must miss.
  dropFishBone(bones, 'player', 0.5, 0.2, TRACK_LENGTH);
  ageFishBones(bones, 0.5);
  if (fishBoneHitFor(bones, 'rival-a', bones[0].progress, 0.2 + ITEM_FEEL.fishBoneHitLane + 0.01, TRACK_LENGTH)) {
    fail('fish bone hit outside the lane window');
  }
  // per-kart cap: a third drop evicts the OLDEST of that owner only.
  bones.length = 0;
  dropFishBone(bones, 'player', 0.2, 0, TRACK_LENGTH);
  dropFishBone(bones, 'rival-a', 0.4, 0, TRACK_LENGTH);
  dropFishBone(bones, 'player', 0.6, 0, TRACK_LENGTH);
  dropFishBone(bones, 'player', 0.8, 0, TRACK_LENGTH);
  const playerBones = bones.filter((bone) => bone.owner === 'player');
  if (playerBones.length !== ITEM_FEEL.fishBonePerKartCap) fail('per-kart bone cap broken', { count: playerBones.length });
  if (bones.filter((bone) => bone.owner === 'rival-a').length !== 1) fail('cap evicted another kart\'s bone');
  if (playerBones.some((bone) => Math.abs((0.2 - ITEM_FEEL.fishBoneDropBack / TRACK_LENGTH) - bone.progress) < 1e-9)) {
    fail('cap kept the oldest bone instead of evicting it');
  }

  // -- snowball: spawn-ahead, owner immunity, ttl, wrap ----------------------
  const projectiles = [];
  throwSnowball(projectiles, 'player', 0.5, 0.1, 200, 'carrot');
  if (projectiles[0].skin !== 'carrot') fail('snowball lost its character skin');
  if (projectiles[0].speed !== 200 + SNOWBALL.relSpeed) fail('snowball relative speed wrong');
  if (projectileHitFor(projectiles, 'player', projectiles[0].progress, 0.1, TRACK_LENGTH)) {
    fail('own snowball hit its thrower');
  }
  const rivalStruck = projectileHitFor(projectiles, 'rival-a', projectiles[0].progress, 0.1, TRACK_LENGTH);
  if (!rivalStruck) fail('snowball missed a kart dead in its window');
  if (projectiles.length !== 0) fail('snowball not consumed on hit');
  throwSnowball(projectiles, 'player', 0.5, 0.1, 200);
  updateProjectiles(projectiles, SNOWBALL.ttl + 0.1, TRACK_LENGTH);
  if (projectiles.length !== 0) fail('snowball outlived its ttl');
  // wrap-aware hit: ball just past 1.0, kart just after 0.
  throwSnowball(projectiles, 'player', 0.999, 0, 200);
  if (!projectileHitFor(projectiles, 'rival-a', 0.0005, 0, TRACK_LENGTH)) fail('projectile window not wrap-aware');
  projectiles.length = 0;

  // -- sardine: target selection + homing steer ------------------------------
  const racers = [
    { lane: 0.4, lap: 1, name: 'ahead-near', progress: 0.6 },
    { lane: -0.2, lap: 1, name: 'ahead-far', progress: 0.9 },
    { lane: 0, lap: 1, name: 'behind', progress: 0.3 },
  ];
  if (sardineTargetFor(racers, 0.5) !== 'ahead-near') fail('sardine must target the NEAREST kart ahead');
  if (sardineTargetFor(racers, 0.95) !== null) fail('sardine found a target with nobody ahead');
  throwSardine(projectiles, 'player', 0.5, -0.4, 200, 'ahead-near');
  const sardineBall = projectiles[0];
  if (sardineBall.homing !== 'ahead-near' || sardineBall.skin !== 'sardine') fail('sardine projectile malformed');
  const laneBefore = sardineBall.lane;
  updateProjectiles(projectiles, 0.1, TRACK_LENGTH, racers);
  const steered = sardineBall.lane - laneBefore;
  if (!(steered > 0 && steered <= SARDINE.laneSteer * 0.1 + 1e-9)) {
    fail('sardine homing steer out of spec', { steered });
  }
  projectiles.length = 0;

  // -- slap fish: alongside window, never self -------------------------------
  const scrum = [
    { lane: 0.3, name: 'alongside', progress: 0.5 },
    { lane: 0.3, name: 'far-ahead', progress: 0.5 + (SLAP_FISH.hitProgress + 2) / TRACK_LENGTH },
    { lane: 0.3 + SLAP_FISH.hitLane + 0.01, name: 'wide', progress: 0.5 },
    { lane: 0.3, name: 'player', progress: 0.5 },
  ];
  const slapped = slapFishHitsFor(scrum, 'player', 0.5, 0.3, TRACK_LENGTH);
  if (slapped.length !== 1 || slapped[0] !== 'alongside') fail('slap fish window wrong', { slapped });

  // -- blizzard: trap placement, no owner immunity, expiry --------------------
  const blizzards = [];
  dropBlizzard(blizzards, 'player', 0.5, 0, TRACK_LENGTH);
  const blizzardBack = (0.5 - blizzards[0].progress) * TRACK_LENGTH;
  if (Math.abs(blizzardBack - BLIZZARD.dropBack) > 0.01) fail('blizzard drop-back wrong', { blizzardBack });
  if (!insideBlizzard(blizzards, blizzards[0].progress, 0, TRACK_LENGTH)) fail('blizzard dome not detected');
  // no owner immunity by design — your own fog slows you too.
  if (!insideBlizzard(blizzards, blizzards[0].progress, 0.5, TRACK_LENGTH)) fail('blizzard lane window too small');
  if (insideBlizzard(blizzards, blizzards[0].progress, BLIZZARD.hitLane + 0.01, TRACK_LENGTH)) {
    fail('blizzard caught a kart outside the dome');
  }
  updateBlizzards(blizzards, BLIZZARD.duration + 0.1);
  if (blizzards.length !== 0) fail('blizzard outlived its duration');

  // -- penguin march: spawn ahead, sweep, band hit ----------------------------
  const march = startMarch(0.5, TRACK_LENGTH);
  const aheadUnits = (march.progress - 0.5) * TRACK_LENGTH;
  if (Math.abs(aheadUnits - MARCH.aheadUnits) > 0.01) fail('march crossing point wrong', { aheadUnits });
  if (march.head !== MARCH.startLane) fail('march head must start off-road');
  if (marchHitFor(march, march.progress, 0, TRACK_LENGTH)) fail('march hit before the train reached the road');
  let marchDone = false;
  for (let step = 0; step < 200 && !marchDone; step += 1) marchDone = updateMarch(march, 0.05);
  if (!marchDone) fail('march never cleared the far edge');
  const midMarch = startMarch(0.5, TRACK_LENGTH);
  updateMarch(midMarch, (0 - MARCH.startLane) / MARCH.laneSpeed); // head reaches lane 0
  if (!marchHitFor(midMarch, midMarch.progress, 0, TRACK_LENGTH)) fail('march missed a kart on the train line');
  if (marchHitFor(midMarch, midMarch.progress, 0.2, TRACK_LENGTH)) fail('march hit ahead of the train head');

  // -- aurora / avalanche constants (applied in the JSX; shape-checked here) --
  if (!(AURORA.duration > 0 && AURORA.speedKick > 0)) fail('aurora constants malformed', AURORA);
  if (!(AVALANCHE.warningDuration > 0 && AVALANCHE.spinDuration > 0 && AVALANCHE.speedScale < 1)) {
    fail('avalanche constants malformed', AVALANCHE);
  }

  // -- rival gates: crossing detection, per-rival offsets ---------------------
  for (let rivalIndex = 0; rivalIndex < 3; rivalIndex += 1) {
    const boneGate = (0.31 + rivalIndex * 0.07) % 1;
    const cocoaGate = (0.66 + rivalIndex * 0.07) % 1;
    if (rivalItemActionAt(rivalIndex, boneGate - 0.01, boneGate + 0.01) !== 'fishbone') {
      fail('rival fishbone gate did not fire', { rivalIndex });
    }
    if (rivalItemActionAt(rivalIndex, cocoaGate - 0.01, cocoaGate + 0.01) !== 'cocoa') {
      fail('rival cocoa gate did not fire', { rivalIndex });
    }
    if (rivalItemActionAt(rivalIndex, boneGate + 0.02, boneGate + 0.04) !== null) {
      fail('rival gate fired without a crossing', { rivalIndex });
    }
  }
};

// ₿ collectible coins (owner concept, shipped 2026-07-07): pure semantics.
const validateRaceCoinHelpers = () => {
  const TRACK_LENGTH = 3000;
  for (const [trackKey, rows] of Object.entries(COIN_ROWS)) {
    const field = buildCoinField(trackKey);
    // Two per row — owner 2026-07-11: "only 2 in a row not 3, 3 makes it
    // too easy to get them".
    if (field.length !== rows.length * 2) fail('coin field size wrong', { count: field.length, trackKey });
    const ids = new Set(field.map((coin) => coin.id));
    if (ids.size !== field.length) fail('coin ids not unique', { trackKey });
  }
  if (buildCoinField('unknown-track').length !== 0) fail('unknown track must have no coins');

  const field = buildCoinField('comeback-city');
  const first = field[1]; // +spread coin of row 0
  // The center line must collect NOTHING — that's the owner's difficulty
  // call; a coin requires committing to a side.
  if (collectCoinsForFrame(field, first.progress, 0, TRACK_LENGTH).length) {
    fail('center line grabbed a coin — rows must leave the middle empty');
  }
  const grabbed = collectCoinsForFrame(field, first.progress, COIN_FEEL.laneSpread, TRACK_LENGTH);
  if (!grabbed.includes(first.id)) fail('side coin not grabbed dead-on');
  if (collectCoinsForFrame(field, first.progress, COIN_FEEL.laneSpread, TRACK_LENGTH).includes(first.id)) {
    fail('collected coin grabbed twice before respawn');
  }
  if (
    collectCoinsForFrame(field, first.progress, COIN_FEEL.laneSpread + COIN_FEEL.hitLane + 0.01, TRACK_LENGTH).length
  ) {
    fail('coin grabbed outside the lane window');
  }
  respawnCoins(field);
  if (field.some((coin) => coin.collected)) fail('respawn left coins collected');
  if (!collectCoinsForFrame(field, first.progress, COIN_FEEL.laneSpread, TRACK_LENGTH).includes(first.id)) {
    fail('respawned coin not grabbable');
  }
  // wrap-aware grab across the lap seam
  const wrapField = [{ collected: false, id: 0, lane: 0, progress: 0.999 }];
  if (!collectCoinsForFrame(wrapField, 0.0005, 0, TRACK_LENGTH).length) fail('coin window not wrap-aware');

  if (coinSpeedMultiplier(0) !== 1) fail('zero coins must be multiplier 1');
  const capped = coinSpeedMultiplier(COIN_FEEL.maxSpeedCoins);
  if (coinSpeedMultiplier(99) !== capped) fail('coin speed bonus must cap', { capped });
  if (coinSpeedMultiplier(-5) !== 1) fail('negative coins must clamp to 1');
  if (coinsAfterSpin(10) !== 10 - COIN_FEEL.spinLoss) fail('spin loss wrong');
  if (coinsAfterSpin(1) !== 0) fail('spin loss must floor at zero');

  // Placement discipline: every row clear of its track's pads and boxes.
  const MARKERS = {
    'comeback-city': [0.055, 0.205, 0.435, 0.875, 0.025, 0.115, 0.225, 0.36, 0.5, 0.6, 0.74, 0.86],
    'penguin-village': [0.12, 0.33, 0.58, 0.85, 0.06, 0.18, 0.3, 0.46, 0.6, 0.74],
  };
  for (const [trackKey, rows] of Object.entries(COIN_ROWS)) {
    for (const row of rows) {
      for (const marker of MARKERS[trackKey]) {
        const delta = Math.min(Math.abs(row - marker), 1 - Math.abs(row - marker));
        if (delta < 0.02) fail('coin row crowds a pickup marker', { marker, row, trackKey });
      }
    }
  }
};

await validateAssetManifest();
validateItems();
validateHeldItemHelpers();
validateRaceCoinHelpers();
validateKartContactHelpers();
validateKartPhysicsHelpers();
validatePaletteMomentHelpers();
validateRaceProgressHelpers();
validateChaseCameraHelpers();
validateRaceAudioHelpers();
validateRaceRivalHelpers();
validateRaceFrameUpdateHelpers();
validateRaceFrameClockHelpers();
validateRaceFinishRuntimeHelpers();
validateRacePlayerFrameHelpers();
validateRaceTelemetryHelpers();
validateRaceTelemetryRuntimeHelpers();
validateRaceControlHelpers();
validateRaceRuntimeSetupHelpers();
validateRaceRuntimeSceneHelpers();
validateRaceCameraRuntimeHelpers();
validateRaceMotionRuntimeHelpers();
validateRaceUpdateRuntimeHelpers();
validateRaceVehicleRuntimeHelpers();
validateRaceDropRuntimeHelpers();
validateRaceHitRuntimeHelpers();
validateRaceRuntimeActionHelpers();
validateRacePlaytestStateHelpers();
if (RACE_TRACKS.length !== Object.keys(REQUIRED_TRACKS).length) {
  fail('Race track count mismatch', {
    actual: RACE_TRACKS.length,
    expected: Object.keys(REQUIRED_TRACKS).length,
  });
}

const summaries = RACE_TRACKS.map((track) => {
  validateTrack(track);
  const runs = [];
  for (let raceIndex = 0; raceIndex < 3; raceIndex += 1) {
    runs.push({ mode: 'free-switch', order: simulateRace(track, raceIndex, 'free-switch') });
    runs.push({ mode: 'vehicle-restricted', order: simulateRace(track, raceIndex, 'vehicle-restricted') });
  }
  return {
    hazards: [...new Set(track.hazards.map((hazard) => hazard.type))],
    key: track.key,
    runs,
    signature: track.signatureItem.key,
  };
});

console.log(JSON.stringify({ itemCount: ITEM_DEFINITIONS.length, status: 'ok', tracks: summaries }, null, 2));
