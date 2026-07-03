export const TRACK_VISUAL_SCHEMA_VERSION = 1;

export const TRACK_VISUAL_ASSETS = Object.freeze({
  'barrier.neon-pylon': Object.freeze({
    description: 'Instanced neon edge pylon used as a non-colliding visual barrier cue.',
    kind: 'barrier-family',
  }),
});

const DEFAULT_ROAD_VISUAL = Object.freeze({
  asphalt: Object.freeze({
    base: '#2c3450',
    speckles: Object.freeze([
      Object.freeze({ color: '#3a4666', count: 420, size: 2.4 }),
      Object.freeze({ color: '#202840', count: 360, size: 3.1 }),
      Object.freeze({ color: '#46537a', count: 130, size: 1.6 }),
    ]),
  }),
  barrier: Object.freeze({
    enabled: true,
    railColor: '#36e2ff',
    wallA: '#e94d3f',
    wallB: '#f8fbff',
  }),
  curb: Object.freeze({
    colorA: '#ff5d4f',
    colorB: '#f8fbff',
    enabled: true,
    width: 3.2,
  }),
  laneMarkings: Object.freeze({
    color: '#ffd34f',
    enabled: true,
    everySamples: 4,
    mode: 'center-dash',
  }),
  shoulder: Object.freeze({
    color: '#222b40',
    enabled: true,
    width: 5.5,
  }),
});

const ALLOWED_LANE_MARKINGS = new Set(['none', 'center-dash']);

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const wrap01 = (value) => ((value % 1) + 1) % 1;

const finiteOr = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeHex = (value, fallback) =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/iu.test(value) ? value : fallback;

const plainVector = (value, fallback = { x: 0, y: 0, z: 0 }) => ({
  x: finiteOr(value?.x, fallback.x),
  y: finiteOr(value?.y, fallback.y),
  z: finiteOr(value?.z, fallback.z),
});

const normalizeVector = (value, fallback = { x: 0, y: 0, z: 1 }) => {
  const vector = plainVector(value, fallback);
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (length < 0.000001) return { ...fallback };
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
};

const progressSpan = (start, end) => {
  const raw = wrap01(end) - wrap01(start);
  return raw <= 0 ? raw + 1 : raw;
};

export const progressInRange = (progress, start, end) => {
  const p = wrap01(progress);
  const a = wrap01(start);
  const b = wrap01(end);
  return a < b ? p >= a && p < b : p >= a || p < b;
};

export const stableUnitInterval = (text) => {
  let hash = 2166136261;
  for (let index = 0; index < String(text).length; index += 1) {
    hash ^= String(text).charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
};

const normalizeRoadBand = (entry, index) => ({
  bankingDegrees: clamp(finiteOr(entry.bankingDegrees ?? entry.banking, 0), -9, 9),
  curbWidth: Math.max(0.5, finiteOr(entry.curbWidth, DEFAULT_ROAD_VISUAL.curb.width)),
  endProgress: wrap01(finiteOr(entry.endProgress ?? entry.end, 1)),
  key: entry.key || `road-band-${index}`,
  laneMarking: ALLOWED_LANE_MARKINGS.has(entry.laneMarking) ? entry.laneMarking : DEFAULT_ROAD_VISUAL.laneMarkings.mode,
  shoulderWidth: Math.max(0, finiteOr(entry.shoulderWidth, DEFAULT_ROAD_VISUAL.shoulder.width)),
  startProgress: wrap01(finiteOr(entry.startProgress ?? entry.start, 0)),
  width: Math.max(1, finiteOr(entry.width, 50)),
});

const defaultBandsForTrack = (trackDef) => {
  const ribbons = asArray(trackDef.course?.roadRibbons || trackDef.courseV2?.roadRibbons);
  if (ribbons.length) {
    return ribbons.map((ribbon, index) =>
      normalizeRoadBand(
        {
          curbWidth: DEFAULT_ROAD_VISUAL.curb.width,
          endProgress: ribbon.endProgress,
          key: ribbon.key,
          laneMarking: DEFAULT_ROAD_VISUAL.laneMarkings.mode,
          shoulderWidth: ribbon.shoulderWidth ?? DEFAULT_ROAD_VISUAL.shoulder.width,
          startProgress: ribbon.startProgress,
          width: ribbon.width,
        },
        index
      )
    );
  }
  return [normalizeRoadBand({ endProgress: 1, key: 'default-road', startProgress: 0, width: trackDef.width || 50 }, 0)];
};

const normalizeRoadVisual = (trackDef, visual) => {
  const source = visual.road || {};
  const asphalt = source.asphalt || {};
  const barrier = source.barrier || {};
  const curb = source.curb || {};
  const laneMarkings = source.laneMarkings || {};
  const shoulder = source.shoulder || {};
  return {
    asphalt: {
      base: normalizeHex(asphalt.base, DEFAULT_ROAD_VISUAL.asphalt.base),
      speckles: asArray(asphalt.speckles).length ? asArray(asphalt.speckles) : DEFAULT_ROAD_VISUAL.asphalt.speckles,
    },
    barrier: {
      enabled: barrier.enabled ?? DEFAULT_ROAD_VISUAL.barrier.enabled,
      railColor: normalizeHex(barrier.railColor, DEFAULT_ROAD_VISUAL.barrier.railColor),
      wallA: normalizeHex(barrier.wallA, DEFAULT_ROAD_VISUAL.barrier.wallA),
      wallB: normalizeHex(barrier.wallB, DEFAULT_ROAD_VISUAL.barrier.wallB),
    },
    bands: asArray(source.bands).length ? source.bands.map(normalizeRoadBand) : defaultBandsForTrack(trackDef),
    curb: {
      colorA: normalizeHex(curb.colorA, DEFAULT_ROAD_VISUAL.curb.colorA),
      colorB: normalizeHex(curb.colorB, DEFAULT_ROAD_VISUAL.curb.colorB),
      enabled: curb.enabled ?? DEFAULT_ROAD_VISUAL.curb.enabled,
      width: Math.max(0.5, finiteOr(curb.width, DEFAULT_ROAD_VISUAL.curb.width)),
    },
    laneMarkings: {
      color: normalizeHex(laneMarkings.color, DEFAULT_ROAD_VISUAL.laneMarkings.color),
      enabled: laneMarkings.enabled ?? DEFAULT_ROAD_VISUAL.laneMarkings.enabled,
      everySamples: Math.max(1, Math.round(finiteOr(laneMarkings.everySamples, DEFAULT_ROAD_VISUAL.laneMarkings.everySamples))),
      mode: ALLOWED_LANE_MARKINGS.has(laneMarkings.mode) ? laneMarkings.mode : DEFAULT_ROAD_VISUAL.laneMarkings.mode,
    },
    shoulder: {
      color: normalizeHex(shoulder.color, DEFAULT_ROAD_VISUAL.shoulder.color),
      enabled: shoulder.enabled ?? DEFAULT_ROAD_VISUAL.shoulder.enabled,
      width: Math.max(0, finiteOr(shoulder.width, DEFAULT_ROAD_VISUAL.shoulder.width)),
    },
  };
};

const normalizePlacement = (entry, index) => ({
  assetId: entry.assetId,
  color: normalizeHex(entry.color, '#36e2ff'),
  endProgress: wrap01(finiteOr(entry.endProgress ?? entry.end, 1)),
  every: Math.max(0.0025, finiteOr(entry.every, 0.05)),
  jitter: clamp(finiteOr(entry.jitter, 0), 0, 0.5),
  key: entry.key || `placement-${index}`,
  kind: entry.kind || TRACK_VISUAL_ASSETS[entry.assetId]?.kind || 'prop-family',
  maxInstances: Math.max(0, Math.floor(finiteOr(entry.maxInstances, 0))),
  offset: Math.max(0, finiteOr(entry.offset, 5)),
  scale: Math.max(0.1, finiteOr(entry.scale, 1)),
  sides: asArray(entry.sides).length ? entry.sides.map((side) => (Number(side) < 0 ? -1 : 1)) : [1],
  startProgress: wrap01(finiteOr(entry.startProgress ?? entry.start, 0)),
  verticalOffset: finiteOr(entry.verticalOffset, 0),
});

const normalizeDistrictCue = (entry, index) => ({
  accent: normalizeHex(entry.accent, '#36e2ff'),
  base: normalizeHex(entry.base, '#16213e'),
  key: entry.key || `district-cue-${index}`,
  progress: wrap01(finiteOr(entry.progress, 0)),
  side: Number(entry.side) < 0 ? -1 : 1,
  span: clamp(finiteOr(entry.span, 0.032), 0.008, 0.08),
});

export const resolveTrackVisuals = (trackDef, { enabled = true } = {}) => {
  const visual = trackDef.visual || {};
  return {
    districtCues: asArray(visual.districtCues).map(normalizeDistrictCue),
    enabled: Boolean(enabled && (visual.enabled ?? true)),
    finishGate: {
      beacon: normalizeHex(visual.finishGate?.beacon, '#36e2ff'),
      halo: normalizeHex(visual.finishGate?.halo, '#ffd34f'),
      trim: normalizeHex(visual.finishGate?.trim, '#f8fbff'),
    },
    materialFamilies: {
      contact: visual.materialFamilies?.contact || 'soft-neon-contact',
      districtEdge: visual.materialFamilies?.districtEdge || 'district-edge-glow',
      road: visual.materialFamilies?.road || 'neon-asphalt',
    },
    placements: asArray(visual.placements).map(normalizePlacement),
    road: normalizeRoadVisual(trackDef, visual),
    schemaVersion: TRACK_VISUAL_SCHEMA_VERSION,
    sourceKey: visual.key || `${trackDef.key || 'track'}-visuals`,
    trackKey: trackDef.key || 'unknown-track',
  };
};

export const roadVisualBandAt = (visuals, progress) => {
  const bands = visuals?.road?.bands || [];
  return bands.find((band) => progressInRange(progress, band.startProgress, band.endProgress)) || bands[bands.length - 1] || null;
};

export const createCenterlineFrame = (sampler, progress) => {
  const sample = sampler.pointAt(progress, 0);
  const tangent = normalizeVector(sample.tangent);
  const normal = normalizeVector(sample.normal || { x: -tangent.z, y: 0, z: tangent.x });
  return {
    center: plainVector(sample.center || sample.point),
    normal,
    point: plainVector(sample.point || sample.center),
    progress: wrap01(progress),
    tangent,
    width: finiteOr(sampler.widthAt?.(progress), sample.width || 50),
  };
};

export const offsetFramePoint = (frame, lateralOffset = 0, verticalOffset = 0) => ({
  x: frame.center.x + frame.normal.x * lateralOffset,
  y: frame.center.y + frame.normal.y * lateralOffset + verticalOffset,
  z: frame.center.z + frame.normal.z * lateralOffset,
});

export const buildCenterlineFrameSamples = (sampler, { sampleCount = 112 } = {}) =>
  Array.from({ length: sampleCount + 1 }, (_, index) =>
    createCenterlineFrame(sampler, index / sampleCount)
  );

export const buildVisualPlacementAnchors = (visuals, options = {}) => {
  if (!visuals?.enabled) return [];
  const anchors = [];
  const onlyKey = options.placementKey || null;
  for (const placement of visuals.placements || []) {
    if (onlyKey && placement.key !== onlyKey) continue;
    const span = progressSpan(placement.startProgress, placement.endProgress);
    const stepCount = Math.max(1, Math.floor(span / placement.every));
    const maxInstances = placement.maxInstances || Infinity;
    let emitted = 0;
    for (let step = 0; step < stepCount && emitted < maxInstances; step += 1) {
      const baseProgress = wrap01(placement.startProgress + step * placement.every);
      for (const side of placement.sides) {
        if (emitted >= maxInstances) break;
        const unit = stableUnitInterval(`${visuals.trackKey}:${placement.key}:${step}:${side}`);
        const jitter = (unit - 0.5) * placement.jitter * placement.every;
        anchors.push({
          assetId: placement.assetId,
          color: placement.color,
          index: emitted,
          key: `${placement.key}-${step}-${side < 0 ? 'left' : 'right'}`,
          offset: placement.offset,
          placementKey: placement.key,
          progress: wrap01(baseProgress + jitter),
          scale: placement.scale,
          side,
          verticalOffset: placement.verticalOffset,
        });
        emitted += 1;
      }
    }
  }
  return anchors;
};

export const validateTrackVisuals = (tracks) => {
  const errors = [];
  const warnings = [];
  for (const track of tracks || []) {
    const visual = track.visual;
    if (!visual) continue;
    const prefix = track.key || 'unknown-track';
    if (visual.schemaVersion !== TRACK_VISUAL_SCHEMA_VERSION) {
      errors.push(`${prefix}: visual.schemaVersion must be ${TRACK_VISUAL_SCHEMA_VERSION}`);
    }
    const bands = asArray(visual.road?.bands);
    const bandKeys = new Set();
    bands.forEach((band, index) => {
      const key = band.key || `band-${index}`;
      if (bandKeys.has(key)) errors.push(`${prefix}: duplicate visual road band key "${key}"`);
      bandKeys.add(key);
      const start = finiteOr(band.startProgress ?? band.start, NaN);
      const end = finiteOr(band.endProgress ?? band.end, NaN);
      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        errors.push(`${prefix}:${key}: road band progress values must be finite`);
      }
      if (Number.isFinite(start) && Number.isFinite(end) && start === end) {
        errors.push(`${prefix}:${key}: road band start and end progress cannot match`);
      }
      if (band.laneMarking && !ALLOWED_LANE_MARKINGS.has(band.laneMarking)) {
        errors.push(`${prefix}:${key}: unknown lane marking "${band.laneMarking}"`);
      }
      if (band.assetId && !TRACK_VISUAL_ASSETS[band.assetId]) {
        errors.push(`${prefix}:${key}: unknown visual asset ID "${band.assetId}"`);
      }
    });
    asArray(visual.placements).forEach((placement, index) => {
      const key = placement.key || `placement-${index}`;
      if (!placement.assetId || !TRACK_VISUAL_ASSETS[placement.assetId]) {
        errors.push(`${prefix}:${key}: unknown visual asset ID "${placement.assetId || 'missing'}"`);
      }
      if (finiteOr(placement.every, 0) <= 0) {
        errors.push(`${prefix}:${key}: placement.every must be positive`);
      }
      if (!asArray(placement.sides).every((side) => side === -1 || side === 1)) {
        errors.push(`${prefix}:${key}: placement.sides may only contain -1 or 1`);
      }
    });
    asArray(visual.districtCues).forEach((cue, index) => {
      const key = cue.key || `district-cue-${index}`;
      if (!Number.isFinite(Number(cue.progress))) {
        errors.push(`${prefix}:${key}: district cue progress must be finite`);
      }
      if (cue.side !== -1 && cue.side !== 1) {
        errors.push(`${prefix}:${key}: district cue side must be -1 or 1`);
      }
    });
    const resolved = resolveTrackVisuals(track);
    if (!resolved.road.bands.length) warnings.push(`${prefix}: visual road resolved with no bands`);
  }
  return {
    errors,
    ok: errors.length === 0,
    warnings,
  };
};

export const formatTrackVisualValidation = (result) =>
  [
    ...result.errors.map((error) => `ERROR ${error}`),
    ...result.warnings.map((warning) => `WARN ${warning}`),
  ].join('\n');

export const assertValidTrackVisuals = (tracks) => {
  const result = validateTrackVisuals(tracks);
  if (!result.ok) {
    throw new Error(`Track visual validation failed:\n${formatTrackVisualValidation(result)}`);
  }
  return result;
};
