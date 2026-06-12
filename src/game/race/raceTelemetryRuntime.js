import { VEHICLES } from './physics/kartTuning.js';
import { publishRaceTelemetryFrame } from './raceTelemetry.js';

export const DEFAULT_RACE_TELEMETRY_INTERVAL_MS = 250;

export const createRaceTelemetryRuntime = ({
  camera,
  boostPadMeshes = [],
  brakingTelemetryActiveFor = () => false,
  collisionCircles = [],
  compiled,
  getCameraRouteLookahead = () => null,
  includeVisualTelemetry = true,
  intervalMs = DEFAULT_RACE_TELEMETRY_INTERVAL_MS,
  kartOnly = false,
  playtest,
  playerVehicleGroup = null,
  publishDiagnostics = () => null,
  publishFrame = publishRaceTelemetryFrame,
  race,
  renderer = null,
  sceneBudget = null,
  setTelemetry,
  stats,
  vehicles = VEHICLES,
  windowRef = null,
} = {}) => {
  let lastTelemetry = 0;
  if (stats) stats.telemetryIntervalMs = intervalMs;

  const publishTelemetry = (now) => {
    if (stats) stats.telemetryIntervalMs = intervalMs;
    if (now - lastTelemetry <= intervalMs) {
      if (stats) stats.telemetrySkipCount = (stats.telemetrySkipCount || 0) + 1;
      return false;
    }
    lastTelemetry = now;
    if (stats) stats.telemetryPublishCount = (stats.telemetryPublishCount || 0) + 1;
    const telemetryFrame = publishFrame({
      camera,
      boostPadMeshes,
      brakingTelemetryActive: brakingTelemetryActiveFor(playtest),
      cameraRouteLookahead: getCameraRouteLookahead(),
      collisionCircles,
      compiled,
      includeVisualTelemetry,
      kartOnly,
      playtest,
      playerVehicleGroup,
      race,
      renderer,
      sceneBudget,
      setTelemetry,
      stats,
      vehicles,
      windowRef,
    });
    publishDiagnostics({
      playtest,
      race,
      raceVisualTelemetry: telemetryFrame?.raceVisualTelemetry,
    });
    return true;
  };

  return {
    getLastTelemetry: () => lastTelemetry,
    publishTelemetry,
  };
};
