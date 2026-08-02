// Shared scaffolding for the three 4x Comeback City layout candidates.
//
// These are DESIGNS, not a build. Each candidate module exports a real
// TrackDefinition-shaped object so `scripts/track-layout-preview.mjs --file`
// can measure it exactly the way it measures the shipped tracks — same
// sampler, same corner detector, same contrast and sightline gates. Nothing
// here is imported by the game.
//
// Two deliberate choices:
//
// 1. Centerlines are authored as WAYPOINTS + PER-CORNER FILLET RADII and run
//    through the shipped `buildCenterline()`, not as hand-placed points. That
//    is the recommendation in docs/TRACK_DESIGN_NOTES.md section 6, and the
//    reason is measured: Penguin Village (generated) has zero spline kinks,
//    Comeback City (hand-placed) has two of radius ~12 sitting directly on its
//    own start/finish line. It also makes radius a number you STATE rather
//    than one you discover from the sheet afterwards.
//
// 2. Every candidate inherits Comeback City's shipped palette verbatim. The
//    contrast gate (section 7) reads the palette, so borrowing it keeps the
//    candidates on exactly the same footing as the reference build — their
//    contrast verdicts are CC's verdicts (kerb-only everywhere), which is the
//    honest baseline. Authoring new palette values is a later step, after a
//    layout is picked; doing it now would be tuning three palettes to throw
//    two away.

import { buildCenterline, validateCenterline } from '../../src/game/race/tracks/buildCenterline.js';
import { COMEBACK_CITY_TRACK } from '../../src/game/race/tracks/comebackCity.js';

// Comeback City's measured mean speed. Every duration on every candidate sheet
// is this number, so the three are comparable to each other and to the shipped
// track. (tmp/k2.5-launch-repro/telemetry-autoplay.json means 257 u/s across
// the moving part of the race; the shipped lap solves at 260.)
export const MEAN_SPEED = 260;

// Point spacing along the generated centerline. 26 rather than the shipped 22
// because these laps are four times longer and the runtime CatmullRom does not
// need 530 control points to follow a 200-unit radius — and because the one
// authoring mistake that produces a kink is points sitting too close together.
export const SPACING = 26;

export const makeCandidate = ({
  key,
  name,
  tagline,
  thesis,
  waypoints,
  radii,
  scale = 1,
  // Radii are authored in FINAL world units by default, even when the
  // waypoints are scaled. That is not symmetry for its own sake: the corner
  // detector only SEEDS a corner where the smoothed radius drops under 250, so
  // a radius that quietly scales past that threshold stops being counted as a
  // corner at all and silently lengthens the straight it sits in.
  scaleRadii = false,
  spacing = SPACING,
  mainRoadWidth,
  roadRibbons,
  boostPads = [],
  itemBoxes = [],
  ramps = [],
  shortcut = null,
  elevation = null,
  coinRows = [],
  startProgress = 0.012,
  notes = {},
}) => {
  const scaled = waypoints.map((point) => ({ x: point.x * scale, z: point.z * scale }));
  const scaledRadii = radii.map((radius) => (scaleRadii ? radius * scale : radius));
  const centerline = buildCenterline(scaled, { radius: scaledRadii, spacing });
  const geometry = validateCenterline(centerline);

  const course = {
    key,
    version: 'candidate-4x',
    laps: 3,
    kartOnly: true,
    mainRoadWidth,
    startProgress,
    startLabel: notes.startLabel || 'Start',
    centerline,
    minimapPath: centerline.map((point) => ({ ...point })),
    roadRibbons,
    branches: [],
    boostPads,
    itemBoxes,
    districtAnchors: [],
    sceneryAnchors: [],
  };

  return {
    key,
    name,
    tagline,
    thesis,
    course,
    laps: 3,
    startOffset: 0.03,
    elevation,
    ramps,
    shortcut,
    // Borrowed verbatim — see the header note.
    palette: COMEBACK_CITY_TRACK.palette,
    // Design metadata the previewer ignores and the comparison sheet reads.
    candidate: {
      geometry,
      waypoints: scaled,
      radii: scaledRadii,
      scale,
      coinRows,
      notes,
    },
  };
};
