export const createRaceTelemetryDiagnostics = (windowRef = globalThis.window) => ({
  publish: ({ playtest = {}, race, raceVisualTelemetry } = {}) => {
    if (!windowRef || !raceVisualTelemetry) return null;
    windowRef.__raceVisualTelemetry = raceVisualTelemetry;
    if (playtest.enabled) {
      windowRef.__raceVisualTelemetrySamples = [
        ...(windowRef.__raceVisualTelemetrySamples || []),
        { at: Number(race.time.toFixed(3)), telemetry: raceVisualTelemetry },
      ].slice(-160);
    }
    return raceVisualTelemetry;
  },
  reset: ({ trackKey } = {}) => {
    if (!windowRef) return;
    if (!trackKey || windowRef.__raceVisualTelemetry?.trackKey === trackKey) {
      windowRef.__raceVisualTelemetry = null;
    }
    if (Object.prototype.hasOwnProperty.call(windowRef, '__raceVisualTelemetrySamples')) {
      windowRef.__raceVisualTelemetrySamples = [];
    }
  },
});
