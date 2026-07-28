// G3 particles & decals for the V2 three-kart runtime (owner-approved plan
// docs/GRAPHICS_CEILING_RAISE_PLAN.md — that approval formally supersedes the
// crisis-era "no particle systems" scope rule).
//
// Budget contract: FOUR added draw calls total, everything pooled up front —
//   1. surface particles ONE InstancedMesh (208 quads, 96 on mobile) shared by
//                       the drift spray, the rolling-contact wash and plume,
//                       the landing puff and the ground shockwave rings
//   2. skid marks       ONE Mesh over ONE ring-buffer BufferGeometry (256/128)
//   3. additive sprites ONE InstancedMesh (160 quads, 72 mobile) shared by the
//                       coin sparkle, the coin spill, the item pickup and use
//                       bursts, the spin-out poof, the mini-turbo sparks, the
//                       ice glints, the flung surface crystals and the
//                       boost/idle exhaust (instanceColor keeps concurrent
//                       systems in their own colors)
//   4. boost speed-lines ONE full-screen NDC quad + fragment shader (a polar
//                       streak field; the pixels do all the work, so there is
//                       no geometry to spin and nothing to occlude the kart)
// Adding a cue means adding an emitter into one of these pools, never a mesh.
//
// Sync contract: one-shot bursts fire off the SAME pure cue derivation the
// race audio uses (kartAudio.cuesForTransition) — the caller feeds cues in,
// this module never invents a second event system, so sight and sound agree
// by construction. Continuous systems (contact wash, spray, skids, sparks,
// exhaust, speed-lines) read the same per-frame drift/boost/surface state.
//
// Grounding contract (wave 3): the kart is glued to the road by CONTACT, not
// by events. Rolling contact emits on every surface at every speed above that
// surface's own gate — tarmac wisps, snow throws powder, off-road throws a
// plume — and the dominant half of that emission is laid FLAT on the ground
// plane rather than billboarded. A camera-facing quad hanging over the road is
// exactly the "floating debris / opaque floating ball" the critics keep
// reading; a ground-aligned quad cannot be read as anything but the surface.
//
// Surface-typing contract (wave 3, round 2): three independent critics looked
// at nine arctic frames and could not find surface typing in any of them, so
// the axes SURFACE_LOOK differed on were the wrong axes. Colour and headcount
// do not survive a still over a dark road. What does is TIME (`linger` — powder
// hangs, tyre smoke is torn away), VALUE (`value` — the arctic road is 20-30
// sRGB steps darker than Miami asphalt, so the same additive puff lands under
// the threshold at which anyone reads it) and SHAPE (`crystal` — a hard
// specular fleck is the one silhouette in this module that cannot be mistaken
// for smoke). Every one of those terms is 1 or 0 on Comeback City, which is
// measurably correct today and must not move.
//
// reducedMotion: speed-lines, ice glints and idle exhaust hide entirely (all
// decorative), spray/sparks/boost-exhaust halve (gameplay-critical tier and
// boost feedback stays readable), the contact wash drops to 0.4 rather than
// zero — after this wave it is the only thing telling the player what they are
// driving on, which is information and not ambience — and one-shot bursts keep
// firing (brief event feedback, not ambient motion).
import * as THREE from 'three';
import { DRIFT_FEEL } from '../driftFeel.js';

const SPRAY_GRAVITY = -16;
const SPRAY_SNOW = new THREE.Color('#DCEEFF');
// Flung ice. Whiter and harder than SPRAY_SNOW on purpose: this is a specular
// chip catching the key light, not a cloud of powder scattering it.
const CRYSTAL_TINT = new THREE.Color('#F4FDFF');

// What a loaded tyre throws off each surface.
//   gate    fraction of top speed where rolling contact starts throwing at all.
//           Tarmac only smokes when it is genuinely overloaded; snow and dirt
//           displace from a crawl, which is most of what tells the two apart
//           from a single still.
//   density puffs laid per WASH_SPACING units of track (see below) — not per
//           second. Emission has to be spatial or the trail thins out exactly
//           when the kart is going fast enough for anyone to look at it.
//           Sized against the traverse measured at FLAT_PROX_FADE_*: a puff is
//           only inside the frame for ~51 ms at racing speed, so 0.6 put SIX
//           of them on the visible road at any instant and the wash read as a
//           few discrete pale patches (comeback-city-p0_78) rather than as a
//           film. The floor for "film" is closer to nine.
//   grow    multiplier on how far one wash puff spreads before it dies.
//   lift    fraction of the emission that billboards INTO THE AIR instead of
//           lying on the ground — powder hangs, tarmac smoke barely does.
//   powder  how much of the particle is displaced GROUND. Snow washes the
//           drift-tier hue to white; tarmac keeps it, because there the spray
//           is tyre smoke and not ground at all. Deliberately 0 for off-road:
//           dirt keeps its own colour on Comeback City, and the arctic floor
//           below still forces it white on Penguin Village.
//   glint   sun-sparkle rate on the surface itself (ice only).
//   tint    the surface's own colour.
//   linger  multiplier on how long a displaced puff survives. Tyre smoke is
//           shear-torn and gone; powder hangs in the air behind the kart. All
//           three wave-3 critics reported seeing no surface typing anywhere in
//           the arctic frames, and this is the axis that was missing: colour
//           and headcount differed, but every puff on both tracks appeared and
//           died on the same clock, so the two surfaces moved identically.
//           Kept modest because rate * ttl is the pool occupancy and the wash
//           shares its 208 slots with the drift spray (see the rate cap below).
//   value   brightness multiplier for the ground wash and the airborne plume.
//           Deliberately 1 on every Comeback City surface: that track measures
//           correct today and nothing here may regress it. The arctic looks are
//           lifted because the same additive puff over Penguin Village's much
//           darker road (16,36,65) simply did not clear the threshold at which
//           anyone reads it — measured across all nine wave3-r2 PV frames.
//   crystal rate of flung ice crystals off the contact patch, relative to
//           speed. This is the ONE cue that cannot be mistaken for tyre smoke:
//           a hard, tiny, specular fleck rather than a soft puff. Zero on every
//           surface that is not frozen.
const SURFACE_LOOK = {
  asphalt: { crystal: 0, density: 0.9, gate: 0.72, grow: 1, lift: 0.3, linger: 1, powder: 0, tint: '#A6947F', value: 1 },
  // Penguin Village's surfaceBands call 0-0.24 and 0.42-1.0 'asphalt' — 82% of
  // the lap — so the arctic track was inheriting Miami tarmac wholesale: the
  // highest gate and the LOWEST density in the table, which is why the wash on
  // penguin-village-p0_56 at 285 km/h is the sparsest emission in the build and
  // why the wave-3 critics could not find surface typing anywhere in the 18
  // frames. Arctic tarmac is salted and snow-dusted, not dry: it displaces from
  // half the speed, throws half again as much, and lifts nearly half of that as
  // powder — so the two tracks differ in HOW MUCH the tyre throws and not only
  // in what colour it is, which is the whole point of a surface-typed system.
  // `powder` 1 also means the ground systems paint with the surface's own white
  // rather than relying on ICE_GROUND_POWDER to scrub tan out afterwards, so
  // the arctic identity is authored rather than corrected.
  //
  // density comes back down from 1.35 as `linger` goes up: occupancy is
  // rate * ttl, and the two together must stay under the pool. What the arctic
  // track gets out of the trade is the right thing — the same amount of
  // material on screen, hanging for half again as long.
  arcticTarmac: {
    crystal: 0.7, density: 1.2, gate: 0.44, grow: 1.2, lift: 0.44, linger: 1.25, powder: 1,
    tint: '#EAF6FF', value: 1.5,
  },
  // Tracks dry tarmac up, and a little past it: the kart is putting its hardest
  // acceleration through the contact patch on a pad.
  boost: { crystal: 0, density: 1.2, gate: 0.62, grow: 1.1, lift: 0.34, linger: 0.9, powder: 0, tint: '#FFC46B', value: 1 },
  ice: {
    crystal: 1.2, density: 0.4, gate: 0.5, glint: 1, grow: 0.85, lift: 0.2, linger: 1.15, powder: 0.55,
    tint: '#DCEEFF', value: 1.35,
  },
  snow: {
    crystal: 1, density: 1.5, gate: 0.3, grow: 1.4, lift: 0.55, linger: 1.35, powder: 1,
    tint: '#F4FBFF', value: 1.6,
  },
  slipZone: {
    crystal: 0.8, density: 1.2, gate: 0.42, grow: 1.25, lift: 0.45, linger: 1.2, powder: 0.8,
    tint: '#CBD8E6', value: 1.3,
  },
  offroad: { crystal: 0, density: 1.8, gate: 0.2, grow: 1.7, lift: 0.5, linger: 1.1, powder: 0, tint: '#8E7A5E', value: 1 },
  // Dropping a wheel off an arctic track puts it in a snow bank, not in dirt.
  // Sharing `offroad` meant the verge on Penguin Village threw the same amount
  // of the same-shaped material as a Miami gravel trap and relied on the ground
  // powder floor to paint it white afterwards — which is why the wave3-r2
  // rubric critic could find "no distinct off-road plume when a kart touches
  // the snow verge". Deep snow throws MORE, throws it HIGHER, and it hangs.
  arcticOffroad: {
    crystal: 1.1, density: 1.7, gate: 0.15, grow: 1.8, lift: 0.62, linger: 1.4, powder: 1,
    tint: '#F4FBFF', value: 1.7,
  },
};

// The contact wash is emitted per unit of TRACK, not per second, and each puff
// is given exactly enough life to cross the window in which it is visible.
//
// The arithmetic that forces this: a puff is laid at the rear wheels, i.e.
// about 26 units in front of a chase camera whose boom is 30-38 units, and the
// camera then closes on it at the kart's own speed. Between PROX_FADE_FULL and
// PROX_FADE_GONE that is 21 units of travel — 0.35 s at 60 units/s but only
// 0.07 s at 289. A per-second rate therefore produces a dense trail while
// parking and ONE puff at racing speed, which is exactly the wave-2 defect:
// the haze ran at 4-12/s, so at 285 there were between one and two on screen
// and each of them read as an object rather than as a film.
//
// Rate = speed / WASH_SPACING * density makes the trail's spatial density
// constant, and ttl = WASH_WINDOW / speed makes the pool occupancy constant
// too (rate * ttl cancels speed exactly), so neither the look nor the budget
// moves with the speedometer. WASH_WINDOW is deliberately larger than the 21
// units measured above: the camera package is being rebuilt in this same wave,
// and a puff that outlives the window merely fades on the proximity ramp,
// while one that dies inside it pops.
const WASH_SPACING = 1;
const WASH_WINDOW = 30;
const WASH_TTL_MIN = 0.16;
const WASH_TTL_MAX = 0.8;
const washTtlFor = (speed) =>
  Math.min(WASH_TTL_MAX, Math.max(WASH_TTL_MIN, WASH_WINDOW / Math.max(30, speed)));
// The road package owns the surface vocabulary and is landing its off-road /
// rumble band in the same wave as this file. Alias every name it could
// plausibly ship to a look we already author rather than silently falling back
// to asphalt — a snow bank that emits tarmac smoke is a worse failure than a
// name we guessed wrong.
const SURFACE_ALIASES = {
  dirt: 'offroad',
  grass: 'offroad',
  gravel: 'offroad',
  rumble: 'offroad',
  sand: 'offroad',
  terrain: 'offroad',
  verge: 'offroad',
  powder: 'snow',
  slip: 'slipZone',
  slippery: 'slipZone',
  water: 'slipZone',
};
const resolveSurfaceLook = (surface, offRoad, isIce) => {
  if (offRoad) return isIce ? SURFACE_LOOK.arcticOffroad : SURFACE_LOOK.offroad;
  // isIce substitutes the two looks the road package cannot name for us — the
  // tarmac band and the verge. Ice, snow and slipZone bands are already
  // authored per surface and pass through whatever the track calls them.
  const fallback = isIce ? SURFACE_LOOK.arcticTarmac : SURFACE_LOOK.asphalt;
  if (!surface) return fallback;
  if (isIce && surface === 'asphalt') return SURFACE_LOOK.arcticTarmac;
  return SURFACE_LOOK[surface] || SURFACE_LOOK[SURFACE_ALIASES[surface]] || fallback;
};
// Short-lived by design — a long-lived exhaust particle reads as a fire rather
// than as thrust.
const FLAME_TTL = 0.15;
const FLAME_CORE = new THREE.Color('#FFF6DC');
// Nozzle height above the kart origin. 1.5 sat at the bottom of the bodywork,
// and from a chase camera that projects straight onto the asphalt — measured
// on wave2-r1/penguin-village-p0_15, where the plume decodes as an unbroken
// warm rod lying across the road surface. Anchoring at the diffuser is what
// stops the plume from sharing the road's screen space in the first place.
const FLAME_NOZZLE_Y = 2.5;
// Minimum clearance over the ground SAMPLE, so the nozzle stays off the road
// even on the frames where the kart body is momentarily sunk into it.
const FLAME_MIN_CLEARANCE = 1.9;
// Per-sprite length ceiling, as a multiple of its own width. The old shared
// 5.5 cap put one shell sprite at ~2 x 13 world units (≈350 px at 900p) and a
// dozen of them alive at once summed additively into one continuous stick with
// a blunt end. Sparks still want the full cap — a spark IS a streak — but a
// thrust plume has to read as a cone of gas, so it stays close to round.
const BURST_STRETCH_MAX = 5.5;
const FLAME_SHELL_STRETCH_MAX = 2.6;
const FLAME_CORE_STRETCH_MAX = 1.5;
// Idle exhaust. The kart has to be shedding SOMETHING at all times or it reads
// as a static prop being slid along the road — but an idle puff is furniture,
// not an event, so it is dim, brief and small enough that you only notice it
// when it stops.
const IDLE_FLAME_TTL = 0.2;
const IDLE_FLAME_BRIGHTNESS = 0.14;

// Proximity fade. The chase boom is 30-38 units and the kart runs at ~285, so
// EVERY particle the kart leaves behind is swept through the whole depth range
// and past the lens in about 120 ms. Left alone, the last few frames of that
// sweep are a sprite ballooning to 60-90 px — the "opaque floating ball" read.
// Fade it out while it is still small instead. The window has to clear the
// boom: a particle laid at the rear wheels is born at depth ~25 even at the
// tightest chase gap, and must still be at full strength there.
const PROX_FADE_GONE = 5;
const PROX_FADE_FULL = 22;
// ...but only for BILLBOARDS. A ground-aligned quad is foreshortened into the
// road: its screen area grows with the road's own perspective, never faster, so
// the ballooning defect the window above exists to prevent cannot happen to it.
// The angular cap below already grants flat quads that exemption; the fade did
// not, and it cost the wash most of its read.
//
// Measured against the shipped chase rig (boom 32, height ~12.7, fov 66): the
// road enters the frame at the bottom edge at a camera-space depth of roughly
// 11, the kart sits at ~30, and the wash is laid at the rear wheels at ~25. So
// the whole visible life of a wash puff is depth 25 -> 11, over which the
// billboard ramp takes it from 1.0 to about 0.28 — the trail dims to nothing
// exactly as it reaches the biggest, nearest, most-looked-at band of road, and
// terminates mid-frame instead of running off the bottom edge. At 275 km/h that
// whole traverse is 51 ms, which is also why so few puffs are in the band at
// once (see the density notes on SURFACE_LOOK).
//
// A flat quad now holds full value across the entire visible band and only
// fades over the last few units, by which point the ground it is lying on has
// itself left the bottom of the frame.
const FLAT_PROX_FADE_GONE = 1.4;
const FLAT_PROX_FADE_FULL = 4.5;
// Hard ceiling on the half-angle one sprite may subtend, so a particle that
// slips through the fade window still cannot spike into a frame-filling blob.
// 0.11 is roughly 77 px tall at 900 p on the 60-65 degree chase fov.
const MAX_SPRITE_ANGLE = 0.11;
// ...and a floor. Below about a pixel a soft additive sprite cannot resolve as
// anything except a twinkling speck, which at fifty of them across the far
// road is indistinguishable from sensor noise — and reads as debris for the
// same reason a single large one does. Cheaper to drop them than to draw them.
const MIN_SPRITE_ANGLE = 0.0013;

// Ground-aligned wash. Lifted enough to clear the road's own decals (skids sit
// at 0.14) without floating — at a grazing chase view this is a handful of
// pixels of parallax off the tarmac.
//
// 0.35 rather than the skids' 0.14 because the quads ride the ground sample
// taken under the kart's CENTRE while being laid out at the wheels, and the
// road package is un-gating banking in this same wave: on a 9-degree bank the
// outer wheel's road surface sits ~0.8 units above the centre sample, and
// anything laid at the centre's height there is depth-tested away. The skid
// buffer already carries this exposure (see SKID_LIFT); if banked corners show
// the wash cutting out on the outer line, the real fix is a per-wheel ground
// sample in the particle context, not more lift.
const FLAT_LIFT = 0.35;
// How much of the drift/ground hue survives on a track that is white underfoot
// no matter what the surface bands call it. Two separate floors on purpose:
// the thrown spray has to keep enough tier colour to read as a charge stage,
// while the ground wash has no such job and every trace of the asphalt look's
// warm tan in it reads as desert dust on an ice track (measured on
// wave2-r2/penguin-village-p0_24 at (71,66,63) over a (21,30,45) road).
const ICE_SPRAY_POWDER = 0.6;
const ICE_GROUND_POWDER = 0.92;

// Below a hop's worth of air there is nothing to displace; a puff on every
// kerb bump would be constant noise.
const LANDING_MIN_DROP = 1.2;

// Speed-line exclusion ellipse, in WORLD units around the kart. It used to be
// a constant uv radius tuned at one boom length, which is only correct at that
// boom length: on the wave2-r1 frames where the camera collapsed onto the kart
// (comeback-city-p0_45, p0_67) the bodywork filled the frame and the fixed hole
// left the streak field scratching straight across it. Projecting a world size
// at the kart's own depth tracks every framing, including whatever the camera
// package settles on. 12 x 8 reproduces the previously authored 0.17 x 0.20 uv
// hole at the nominal ~30-unit boom, so the tuned look is unchanged there.
const GUARD_HALF_WIDTH = 12;
const GUARD_HALF_HEIGHT = 8;

// Skid ring buffer. The old 64-quad / 1.25-unit ring held 40 world units per
// wheel and recycled every ~0.17 s at race speed, so the fade never ran and
// the trail terminated on a hard edge a few kart-lengths back. 128 quads per
// wheel at an adaptive 1.6-3.4 unit step is ~1.9 s of trail at MAX_SPEED —
// long enough that a whole corner stays on screen.
const SKID_FADE_SECONDS = 4;
const SKID_STEP_MIN = 1.6;
const SKID_STEP_MAX = 3.4;
// Half a rear tyre's footprint (the wheels sit at x = ±4.6); 0.34 drew a
// pinstripe far narrower than the tyre that supposedly made it.
const SKID_HALF_WIDTH = 0.78;
// The quads ride the ground sample taken under the kart's CENTRE, but they are
// laid at the wheels — on a crowned or banked section the outer wheel's road
// surface is higher than that sample, and at 0.08 the quad sank under it and
// was depth-tested away mid-corner. depthWrite:false does not stop depthTest.
const SKID_LIFT = 0.14;
// Head/tail tapers, in ring slots (two wheels lay one quad each per step).
const SKID_HEAD_QUADS = 6;
const SKID_TAIL_QUADS = 14;
const SKID_TAIL_PINCH = 0.72;

// The monolith owns MAX_SPEED; context.maxSpeed is the contract field. This
// mirror only covers the frame before the caller starts supplying it.
const FALLBACK_MAX_SPEED = 228;

const scratchMatrix = new THREE.Matrix4();
const scratchView = new THREE.Matrix4();
const scratchQuaternion = new THREE.Quaternion();
const scratchRoll = new THREE.Quaternion();
const scratchScale = new THREE.Vector3();
const scratchColor = new THREE.Color();
const scratchProject = new THREE.Vector3();
const scratchRel = new THREE.Vector3();
const HIDDEN_SCALE = new THREE.Vector3(0, 0, 0);
const HIDDEN_POSE = new THREE.Matrix4().compose(
  new THREE.Vector3(0, -50, 0),
  new THREE.Quaternion(),
  HIDDEN_SCALE
);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
// PlaneGeometry faces +Z; this lays it face-up on the ground plane. Composed
// with a per-particle yaw so no two wash puffs share an orientation.
const FLAT_QUAT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);

// Item accents, so a pickup and a use are the colour of the thing picked up.
// The runtime does not put the held item in the particle context today, so
// every one of these is dormant until it does — `context.heldItem` is read
// optionally and DEFAULT_ITEM_TINT covers the current behaviour exactly.
const DEFAULT_ITEM_TINT = '#8FE9FF';
const ITEM_TINTS = {
  aurora: '#B27CFF',
  avalanche: '#EAF6FF',
  blizzard: '#CFEBFF',
  cocoa: '#FFB067',
  fishbone: '#FFE9A8',
  iceshield: '#7FD8FF',
  march: '#FFD34F',
  sardine: '#FF8A5C',
  slapfish: '#6BFFC4',
  snowball: '#FFFFFF',
};
const itemTintFor = (item) => (item && ITEM_TINTS[item]) || DEFAULT_ITEM_TINT;

// Shared soft-dot sprite — hard-edged quads read as tofu at race speed. The
// bright inner stop gives the sprite a core so it survives the tonemap instead
// of averaging out to a uniform smudge. Sparks, coins and exhaust want that
// core; it is what makes them read as energy.
let softDotTexture = null;
const getSoftDotTexture = () => {
  if (softDotTexture) return softDotTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.92)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  softDotTexture = new THREE.CanvasTexture(canvas);
  return softDotTexture;
};

// Displaced ground and tyre smoke want the opposite of a core: no hard centre,
// and — critically — no perfect circle. A radial gradient IS a sphere lit from
// the front, which is exactly why the spray and haze were reading as balls of
// polystyrene hanging over the road. Five overlapping lobes at 60% radius give
// an irregular silhouette that never resolves into one, for the same zero bytes.
let softPuffTexture = null;
const getSoftPuffTexture = () => {
  if (softPuffTexture) return softPuffTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const lobe = (cx, cy, radius, peak) => {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(255,255,255,${peak})`);
    grad.addColorStop(0.55, `rgba(255,255,255,${peak * 0.34})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  };
  // Deterministic offsets — a random puff would differ between the two pools
  // on a reload and make a capture impossible to compare against itself.
  lobe(32, 32, 30, 0.5);
  lobe(24, 26, 19, 0.42);
  lobe(41, 27, 16, 0.38);
  lobe(26, 41, 17, 0.36);
  lobe(42, 40, 20, 0.4);
  softPuffTexture = new THREE.CanvasTexture(canvas);
  return softPuffTexture;
};

const makeBillboardPool = (count, { blending = THREE.AdditiveBlending, map, opacity = 1, size = 0.6 } = {}) => {
  const mesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      blending,
      // White base: every pool drives its tint through instanceColor so two
      // systems can share one mesh (and one draw call) at different colors.
      color: '#ffffff',
      depthWrite: false,
      map: map || getSoftDotTexture(),
      opacity,
      transparent: true,
    }),
    count
  );
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let index = 0; index < count; index += 1) mesh.setMatrixAt(index, HIDDEN_POSE);
  mesh.instanceMatrix.needsUpdate = true;
  // Allocates instanceColor filled with white for every slot.
  mesh.setColorAt(0, scratchColor.set('#ffffff'));
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  // Pools follow the kart anywhere on the course — static bounds would cull.
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
};

// Polar streak field. Everything is computed from the fragment's offset to
// uFocus (the projected look-ahead point) so the streaks converge on where the
// kart is GOING rather than on the middle of the canvas, and each lane scrolls
// along its own axis — motion perpendicular to a streak reads as a spinning
// fan of sticks, which is exactly what the old 14-wedge mesh looked like.
const SPEED_LINE_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const SPEED_LINE_FRAGMENT = /* glsl */ `
uniform float uAspect;
uniform float uDensity;
uniform float uGroundFade;
uniform float uInner;
uniform float uIntensity;
uniform float uLanes;
uniform float uRoadWedge;
uniform float uSkyFade;
uniform float uTime;
uniform float uWidth;
uniform vec2 uFocus;
uniform vec2 uGuard;
uniform vec2 uGuardRadius;
uniform vec3 uTint;
varying vec2 vUv;

const float TAU = 6.2831853;

void main() {
  vec2 p = (vUv - uFocus) * vec2(uAspect, 1.0);
  float r = length(p);
  // Rejects before the polar math. This pass covers the entire framebuffer and
  // it only ever runs while boosting, which is exactly when the frame is
  // already at its most expensive — the ~45% of pixels that provably cannot
  // carry a streak must not pay for an atan and two exps to find that out.
  if (r < uInner) discard;
  float guard = length((vUv - uGuard) / uGuardRadius);
  if (guard < 0.85) discard;

  float lanePos = atan(p.y, p.x) / TAU * uLanes;
  float lane = floor(lanePos);
  // Per-lane hashes: phase, speed, brightness and length jitter, so the field
  // never resolves into one rigid wheel or into concentric rings.
  float h = fract(sin(lane * 91.7) * 43758.5453);
  float h2 = fract(sin(lane * 37.3 + 11.7) * 24634.6345);

  // Constant SCREEN width, not constant angle. An angular profile widens with
  // radius, so the streaks that reach the frame edge — the only ones anybody
  // looks at — were 12 px glowing rods lying over the verge. Measuring the
  // perpendicular distance to the lane axis instead gives hairlines everywhere.
  float dPerp = (fract(lanePos) - 0.5) * (TAU / uLanes) * r;
  float ang = exp(-(dPerp * dPerp) / (uWidth * uWidth));
  if (ang < 0.004) discard;

  float s = fract(r * uDensity - uTime * (2.4 + h * 2.2) - h);
  // Tapered at BOTH ends — a streak with a visible termination reads as a
  // stick, not as speed — and short, so the gap between two streaks on one
  // lane is longer than the streak itself.
  //
  // Length grows with radius because optical flow does. A field of streaks that
  // are all the same length regardless of where they sit is exactly what the
  // wave3-r2 critics read as "dashes" and "scratches": the ones near the focus
  // are correct, and the ones at the periphery — where the world is genuinely
  // tearing past — are far too short to be motion. The taper is on the same
  // r-cycle as the gap, so len must stay under 1 or adjacent streaks merge.
  float len = (0.26 + h2 * 0.2) * (0.72 + r * 0.6);
  float body = smoothstep(0.0, len * 0.42, s) * smoothstep(len, len * 0.5, s);

  // Clean centre; the streaks run off the corners rather than stopping in a
  // mid-frame band, and the kart's own footprint is excluded outright.
  float mask = smoothstep(uInner, uInner + 0.24, r);
  mask *= smoothstep(0.85, 1.4, guard);
  // Depth proxy. Everything above the look-ahead point is sky and skyline —
  // effectively at infinity, so nothing up there can rush past the camera. No
  // depth buffer is bound to this pass, so the horizon anchor stands in for
  // one. The ramp is deliberately long: a short one cuts a visible horizontal
  // seam across the field, which then reads as ground debris rather than as a
  // camera effect.
  float sky = clamp((vUv.y - uFocus.y) / 0.28, 0.0, 1.0);
  mask *= mix(1.0, uSkyFade, sky * sky);
  // ...and the same trick pointing DOWN, which is the wave3-r2 blocker. Below
  // the anchor the frame is not air at all: it is the road, a solid surface a
  // few metres from the lens, and a streak drawn over it has no way to read as
  // anything but a mark ON it — the critics measured "white diagonal dashes
  // lying over the asphalt" and "gouges in the surface" on exactly these
  // pixels. The road's screen footprint is a wedge with its apex at the
  // look-ahead anchor, widening toward the bottom of the frame, so it costs one
  // multiply to describe: uRoadWedge is its half-width in p.x per unit of drop.
  //
  // Attenuated rather than cut. The streaks are pulled down to a whisper over
  // the ribbon the player is actually looking at, while the bottom CORNERS —
  // where the frame is peripheral vision and the world really is tearing past —
  // keep most of their weight, which is where a boost is felt anyway. The
  // constant added to roadHalf keeps the smoothstep's denominator off zero at
  // the apex, where the wedge has no width.
  float drop = max(0.0, uFocus.y - vUv.y);
  float roadHalf = uRoadWedge * drop + 0.02;
  float road = 1.0 - smoothstep(roadHalf * 0.6, roadHalf * 1.45, abs(p.x));
  mask *= mix(1.0, uGroundFade, road);
  float i = ang * body * mask * uIntensity * (0.55 + h * 0.6);
  // Graded to the track, not painted white over it: only the hottest core of a
  // streak pulls back toward white, so the field sits inside the palette.
  vec3 tone = mix(uTint, vec3(1.0), smoothstep(0.16, 0.42, i) * 0.55);
  gl_FragColor = vec4(tone * i, i);
}
`;

export const createRaceParticles = ({ isIce = false, mobile = false } = {}) => {
  const group = new THREE.Group();
  group.name = 'g3-race-particles';

  // Emission scale. The mobile pools are ~40% of desktop, so emitting at the
  // desktop rate there would recycle live particles and shorten every trail
  // rather than thin it.
  const poolScale = mobile ? 0.6 : 1;

  // -- 1. Surface particles (drift spray + contact wash + landing puff) -----
  // Raised from 150/64. The wash is now continuous on every surface rather
  // than only at 78% of top speed on tarmac, and its whole job is to read as
  // ONE film rather than as countable objects — which is a headcount problem,
  // not a brightness problem. Instance matrices are ~5 KB per 64 slots and the
  // draw call count is unchanged; the frame budget has ~14 ms of headroom.
  const sprayCount = mobile ? 96 : 208;
  // Additive on BOTH tracks now. The arctic pool was normal-blended on the
  // reasoning that Penguin Village's surround sits at the bloom knee — but the
  // particles are emitted over the ROAD, and the road there measures (21,30,45)
  // in the wave2-r3 frames, i.e. darker than Comeback City's asphalt, with the
  // wave-3 storm-front grade pushing it darker still.
  //
  // More decisively: every dissolve in this module is a per-instance BRIGHTNESS
  // ramp, and brightness is only opacity under additive blending. Under normal
  // blending a dying particle converges on black rather than on the road, so an
  // arctic puff ended its life as a grey stain, and the proximity fade had to
  // be skipped entirely for it — which is precisely the defect the wave2-r3
  // blind judge logged ("rendering with an opaque hard edge at close camera
  // distance... fade alpha to zero inside ~1.5 units of the camera"). One blend
  // mode, one fade path, no special case.
  const sprayMesh = makeBillboardPool(sprayCount, {
    blending: THREE.AdditiveBlending,
    map: getSoftPuffTexture(),
    // Global damper on the arctic track, where the surround is bright enough
    // that a full-strength additive puff would clip against the snow banks.
    opacity: isIce ? 0.68 : 1,
    size: 0.62,
  });
  sprayMesh.renderOrder = 30;
  group.add(sprayMesh);
  // sizeStart/sizeEnd are lerped over the lifetime, so an emitter chooses
  // whether its particles shrink out (spray, sparks) or bloom out (haze,
  // landing puff) without a second code path. fadeCurve is the exponent on the
  // brightness ramp: below 1 the particle holds its value and then drops (a
  // drift plume has to stay legible), above 1 it bleeds off immediately (haze
  // and puffs are atmosphere). Both reach zero, which the old floored ramp did
  // not — a sprite that dies at 35% brightness pops out of the frame.
  // `flat` swaps the camera billboard for a ground-aligned quad (see the
  // grounding contract at the top of the file); `spin`/`spinRate` only exist
  // for those, because a flat quad has a visible orientation and a field of
  // identically-aligned rectangles reads as tiling.
  const sprayPool = Array.from({ length: sprayCount }, () => ({
    drag: 0,
    fadeCurve: 0.6,
    flat: false,
    floorY: -1e6,
    gravity: SPRAY_GRAVITY,
    life: 0,
    position: new THREE.Vector3(),
    sizeEnd: 0.45,
    sizeStart: 1.4,
    spin: 0,
    spinRate: 0,
    stretch: 1,
    tint: new THREE.Color(),
    ttl: 0,
    velocity: new THREE.Vector3(),
  }));
  let sprayCursor = 0;
  let sprayAccumulator = 0;
  let contactAccumulator = 0;
  let crystalAccumulator = 0;
  let glintAccumulator = 0;
  const sprayTint = new THREE.Color();
  const surfaceTint = new THREE.Color();
  // The surface tint after the powder wash — what the systems that throw
  // GROUND (haze, landing puff) actually paint with. See the derivation in
  // update() for why the raw surface tint is not safe on an arctic track.
  const groundTint = new THREE.Color();
  // Last resolved surface look, kept on the instance because onCue runs BEFORE
  // update() in the caller's frame and the one-shot bursts still have to know
  // what they are landing on. One frame stale at a band boundary, which is
  // three orders of magnitude below the smear the bands themselves have.
  let currentLook = isIce ? SURFACE_LOOK.arcticTarmac : SURFACE_LOOK.asphalt;
  // Banked at pickup so the muzzle flash on `item-use` is the colour of the
  // item that just left — by then the runtime has already cleared it.
  let lastItemTint = DEFAULT_ITEM_TINT;
  const nextSpray = () => {
    const item = sprayPool[sprayCursor];
    sprayCursor = (sprayCursor + 1) % sprayCount;
    return item;
  };

  // -- 2. Skid marks (ring buffer, one geometry updated in place) -----------
  const skidQuads = mobile ? 128 : 256;
  const skidPositions = new Float32Array(skidQuads * 4 * 3);
  const skidColors = new Float32Array(skidQuads * 4 * 4);
  const skidIndices = new Uint16Array(skidQuads * 6);
  for (let quad = 0; quad < skidQuads; quad += 1) {
    const v = quad * 4;
    skidIndices.set([v, v + 1, v + 2, v + 2, v + 1, v + 3], quad * 6);
  }
  const skidGeometry = new THREE.BufferGeometry();
  skidGeometry.setAttribute('position', new THREE.BufferAttribute(skidPositions, 3).setUsage(THREE.DynamicDrawUsage));
  skidGeometry.setAttribute('color', new THREE.BufferAttribute(skidColors, 4).setUsage(THREE.DynamicDrawUsage));
  skidGeometry.setIndex(new THREE.BufferAttribute(skidIndices, 1));
  // Dark rubber on Comeback City asphalt, blue-white scrape on Penguin ice.
  const skidTone = new THREE.Color(isIce ? '#dff4ff' : '#07090f');
  const skidBaseAlpha = isIce ? 0.5 : 0.42;
  const skidMesh = new THREE.Mesh(
    skidGeometry,
    new THREE.MeshBasicMaterial({
      depthWrite: false,
      // Lift over co-planar road decals without moving the quads off the
      // surface on slopes.
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      side: THREE.DoubleSide,
      transparent: true,
      vertexColors: true,
    })
  );
  skidMesh.renderOrder = 4;
  skidMesh.frustumCulled = false;
  skidMesh.castShadow = false;
  group.add(skidMesh);
  const skidAges = new Float32Array(skidQuads).fill(Infinity);
  // Per quad: both edge centres and both edge normals (already scaled to the
  // half width). Keeping the spine lets the tail be re-pinched every frame
  // without re-deriving the heading, and keeping the LAID normal on edge A
  // means consecutive quads still share an exact edge through a corner.
  const skidSpine = new Float32Array(skidQuads * 8);
  const skidY = new Float32Array(skidQuads);
  let skidCursor = 0;
  let skidCursorMoved = false;
  // Per rear wheel: the last laid edge (centre + normal) or null when the
  // drift broke — the next segment starts fresh instead of streaking across.
  const skidTrails = [null, null];

  const writeSkidQuad = (quad, widthScale) => {
    const base = quad * 8;
    const ax = skidSpine[base];
    const az = skidSpine[base + 1];
    const anx = skidSpine[base + 2] * widthScale;
    const anz = skidSpine[base + 3] * widthScale;
    const bx = skidSpine[base + 4];
    const bz = skidSpine[base + 5];
    const bnx = skidSpine[base + 6] * widthScale;
    const bnz = skidSpine[base + 7] * widthScale;
    const y = skidY[quad];
    skidPositions.set(
      [
        ax - anx, y, az - anz,
        ax + anx, y, az + anz,
        bx - bnx, y, bz - bnz,
        bx + bnx, y, bz + bnz,
      ],
      quad * 12
    );
  };

  // -- 3. Additive sprites (coin, spin-out, mini-turbo sparks, exhaust) -----
  // Raised from 128/56 for the cue vocabulary this wave adds (item pickup,
  // item use, coin loss, ice glints, idle exhaust) — same reasoning and same
  // zero draw-call cost as the spray pool above.
  const burstCount = mobile ? 72 : 160;
  const burstMesh = makeBillboardPool(burstCount, { size: 0.5 });
  burstMesh.renderOrder = 32;
  group.add(burstMesh);
  // brightness scales the whole additive contribution: the exhaust shell has to
  // be dim because a dozen of them overlap and it is the SUM the camera sees,
  // never one sprite. flicker is a per-particle phase for the exhaust's scale
  // jitter (0 = steady, which is what every other emitter wants). stretchMax is
  // the per-particle length ceiling described above.
  const burstPool = Array.from({ length: burstCount }, () => ({
    brightness: 1,
    flicker: 0,
    gravity: -7.5,
    life: 0,
    position: new THREE.Vector3(),
    size: 1,
    stretch: 0,
    stretchMax: BURST_STRETCH_MAX,
    tint: new THREE.Color(),
    ttl: 0,
    velocity: new THREE.Vector3(),
  }));
  let burstCursor = 0;
  let sparkAccumulator = 0;
  let flameAccumulator = 0;
  const sparkTint = new THREE.Color();
  const nextBurst = () => {
    const item = burstPool[burstCursor];
    burstCursor = (burstCursor + 1) % burstCount;
    return item;
  };

  // -- 4. Boost speed-lines (screen-space field, one NDC quad) --------------
  // Pad boosts carry the track's own grade rather than a neutral white: a
  // cream streak belongs to Comeback City's sunset, an ice-blue one to the
  // arctic storm. Charged mini-turbos override it with their tier colour.
  const PAD_BOOST_TINT = isIce ? '#BFEAFF' : '#FFDCA8';
  // The plume follows the same rule as the streaks, and for a stronger reason:
  // the wave2-r3 artefact hunter measured 267-1604 warm pixels per frame at
  // (129,42,48) / (149,85,55) over the Penguin Village road — rust lozenges on
  // an ice track — and the untinted #FF9A3C exhaust is the only warm additive
  // system running there. Amber is Comeback City's; the arctic exhales vapour.
  const EXHAUST_TINT = isIce ? '#9FD8FF' : '#FF9A3C';
  const EXHAUST_COLOR = new THREE.Color(EXHAUST_TINT);
  // ...and how far a TIER-coloured plume is pulled back toward it. The arctic
  // override above was silently bypassed the instant a mini-turbo banked a
  // tier, because the plume then takes DRIFT_FEEL.sparkColors — gold at tier 2,
  // purple at tier 3. penguin-village-p0_56 (285 km/h, tier 2) is the proof:
  // three discrete #FFD34F lozenges lying over a blue-white road, which is the
  // same warm-pixels-on-an-ice-track defect the wave2-r3 artefact hunter
  // measured before EXHAUST_TINT existed. Nothing is lost by pulling it: the
  // release burst, the drift sparks and the speed-line field all carry the tier
  // colour undiluted, and they are the systems that fire ON the tier event.
  // Zero on Comeback City — amber thrust over a sunset IS its palette.
  const EXHAUST_TIER_PULL = isIce ? 0.72 : 0;
  const speedLineUniforms = {
    uAspect: { value: 16 / 9 },
    uDensity: { value: 3 },
    uFocus: { value: new THREE.Vector2(0.5, 0.55) },
    uGuard: { value: new THREE.Vector2(0.5, 0.42) },
    // The player kart's uv footprint from the chase camera — re-derived from
    // the kart's live depth every frame (see GUARD_HALF_WIDTH); these are just
    // the first-frame values for the nominal boom. The shader's smoothstep
    // pushes full clearance out to 1.4x whatever radii land here.
    uGuardRadius: { value: new THREE.Vector2(0.17, 0.2) },
    // What survives inside the road wedge. 0.3 rather than the sky's 0.16: the
    // road is where the boost is being SPENT, so the field must not vanish from
    // it entirely — it must stop being legible as individual marks. At 0.3 a
    // streak over the ribbon lifts the asphalt by a handful of counts, which
    // reads as the surface smearing rather than as a scratch in it.
    uGroundFade: { value: 0.3 },
    uInner: { value: 0.46 },
    // Road half-width in p.x per unit of vertical drop below the anchor.
    // Measured off wave3-r2/comeback-city-p0_24: the vanishing point sits at
    // vUv.y ~ 0.5 and the drivable ribbon spans very nearly the full frame
    // width at the bottom edge, i.e. ~0.89 in p.x over a 0.5 drop. 1.6 is a
    // little under that, so the fade's outer ramp lands on the verge rather
    // than out in the barriers.
    uRoadWedge: { value: 1.6 },
    uIntensity: { value: 0 },
    uLanes: { value: mobile ? 84 : 140 },
    // 0.16, not 0.35: the sky and the skyline are at infinity and cannot rush
    // past the lens, so streaks up there read as scratches ON the image rather
    // than as motion through it — the wave-2 artefact hunter measured them
    // across the Comeback City sunset. The long ramp below still prevents the
    // cut from showing as a horizontal seam.
    uSkyFade: { value: 0.16 },
    uTime: { value: 0 },
    // Streak half-width as a fraction of frame HEIGHT (r is measured in the
    // same units). ~2.7 px at 900 p; a phone gets a fatter line because at its
    // pixel count a 2 px streak just aliases into a dotted crawl.
    uWidth: { value: mobile ? 0.0044 : 0.003 },
    uTint: { value: new THREE.Color(PAD_BOOST_TINT) },
  };
  const speedLines = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      fragmentShader: SPEED_LINE_FRAGMENT,
      transparent: true,
      uniforms: speedLineUniforms,
      vertexShader: SPEED_LINE_VERTEX,
    })
  );
  speedLines.name = 'g3-boost-speed-lines';
  speedLines.renderOrder = 60;
  speedLines.frustumCulled = false;
  speedLines.visible = false;
  // Even lane counts only: the atan seam at ±PI lands on a lane boundary, so
  // an odd count would split one streak down the middle of the screen edge.
  // Tier raises the DENSITY of the field rather than its brightness — a purple
  // tier-3 boost should look busier, not blown out.
  const LANES_BY_TIER = mobile ? [72, 84, 96, 104] : [120, 140, 160, 176];
  const speedLineTint = new THREE.Color();
  let boostEnergy = 0;
  let boostPunch = 0;
  // Last frame's overspeed term, banked for onCue — which runs BEFORE update()
  // in the caller's frame and therefore has no speed of its own to reason from.
  let lastOverspeed = 0;
  let wasBoosting = false;
  let speedLineWarmup = 6;
  // Shared animation clock for anything that has to wobble independently of
  // its own lifetime. Wrapped so the phase keeps float precision over a race.
  let clock = 0;

  // Shared per-frame kinematics: the caller may not supply speed yet, and the
  // skid step / boost envelope both need it, so derive it from the kart's own
  // motion and prefer the contract field when it arrives.
  const prevKartPosition = new THREE.Vector3();
  let hasPrevKart = false;
  let measuredSpeed = 0;
  // The camera's own motion, differenced here rather than asked of the caller.
  // It is the dominant term in how fast a particle crosses the screen: at 285
  // units/s the sprite is nearly stationary in the world and it is the LENS
  // that tears past it.
  const cameraPosition = new THREE.Vector3();
  const prevCameraPosition = new THREE.Vector3();
  const cameraVelocity = new THREE.Vector3();
  const inverseCameraQuaternion = new THREE.Quaternion();
  let hasPrevCamera = false;
  // Focal length (1 / tan(fovY/2)) read off the live projection matrix — the
  // chase fov widens with speed and kicks on a mini-turbo, and a sprite's
  // apparent motion scales with it.
  let focalLength = 1.5;

  const scratchCamSpace = new THREE.Vector3();
  const scratchScreenVelocity = new THREE.Vector2();
  // Screen-space motion of one sprite, written into scratchScreenVelocity as
  // (dx, dy) in half-frame-heights per second, and returning the camera-space
  // depth so the caller can fade and clamp on it.
  //
  // This is the fix for the round-blob read. The old code stretched each sprite
  // along its OWN velocity projected onto the camera axes — but exhaust and
  // spray are thrown straight backward, which from a chase camera is almost
  // exactly along the view axis, where nothing moves on screen at all. Every
  // sprite therefore came out unstretched. Differencing against the camera and
  // taking the derivative of the perspective divide gives the real thing: the
  // radial expansion away from the focus that makes a still particle streak.
  const screenVelocityOf = (position, velocity) => {
    scratchCamSpace.copy(position).applyMatrix4(scratchView);
    const depth = -scratchCamSpace.z;
    if (depth <= 0.05) {
      scratchScreenVelocity.set(0, 0);
      return depth;
    }
    scratchRel.copy(velocity).sub(cameraVelocity).applyQuaternion(inverseCameraQuaternion);
    const scale = focalLength / (depth * depth);
    scratchScreenVelocity.set(
      (scratchRel.x * depth + scratchCamSpace.x * scratchRel.z) * scale,
      (scratchRel.y * depth + scratchCamSpace.y * scratchRel.z) * scale
    );
    return depth;
  };

  // How much of a sprite survives at this depth: 1 in the open, 0 once the
  // camera has closed on it, so nothing ever passes the lens at full size.
  // `flat` picks the ground-quad window (see FLAT_PROX_FADE_*) — the same
  // exemption the angular cap below already grants ground quads.
  const proximityAt = (depth, flat) => {
    const gone = flat ? FLAT_PROX_FADE_GONE : PROX_FADE_GONE;
    const full = flat ? FLAT_PROX_FADE_FULL : PROX_FADE_FULL;
    const t = clamp01((depth - gone) / (full - gone));
    return t * t * (3 - 2 * t);
  };
  // Air state, tracked here rather than asked of the caller: the landing puff
  // has to be proportional to the drop or every hop throws the same dust.
  let wasAirborne = false;
  let peakAirHeight = 0;

  // Writes the uv of a world point into scratchUv, off the scratchView the
  // frame already rebuilt.
  const scratchUv = new THREE.Vector2();
  // Camera-space depth of the last projectToUv call, valid whether or not the
  // point was in front of the camera — the guard sizing needs it.
  let lastProjectDepth = 0;
  const projectToUv = (x, y, z, camera) => {
    scratchProject.set(x, y, z).applyMatrix4(scratchView);
    lastProjectDepth = -scratchProject.z;
    // Behind the near plane the perspective divide mirrors the point.
    if (scratchProject.z > -0.5) return false;
    scratchProject.applyMatrix4(camera.projectionMatrix);
    scratchUv.set(scratchProject.x * 0.5 + 0.5, scratchProject.y * 0.5 + 0.5);
    return true;
  };

  // One smoothed chase toward a projected anchor, with a fallback for frames
  // where the point falls behind the camera.
  const followUv = (uniform, hit, fallbackX, fallbackY, smoothing) => {
    const targetX = hit ? scratchUv.x : fallbackX;
    const targetY = hit ? scratchUv.y : fallbackY;
    uniform.x += (targetX - uniform.x) * smoothing;
    uniform.y += (targetY - uniform.y) * smoothing;
  };

  const spawnSpray = (context, tint, ttl) => {
    const item = nextSpray();
    const side = Math.random() < 0.5 ? -1 : 1;
    const cos = Math.cos(context.yaw);
    const sin = Math.sin(context.yaw);
    // Rear-wheel local offset (±4.7, 0.8, -3.6) rotated into world.
    const lx = side * (4.4 + Math.random() * 0.9);
    const lz = -3.4 - Math.random() * 1.2;
    item.position.set(
      context.kartPosition.x + cos * lx + sin * lz,
      context.groundY + 0.7 + Math.random() * 0.5,
      context.kartPosition.z - sin * lx + cos * lz
    );
    // Kicked backward and outward off the wheel, arcing up then under gravity.
    const vx = side * (1.2 + Math.random() * 2.6);
    const vz = -(9 + Math.random() * 6 + context.tier * 2);
    item.velocity.set(cos * vx + sin * vz, 3.2 + Math.random() * 3.4, -sin * vx + cos * vz);
    item.drag = 0;
    item.fadeCurve = 0.55;
    item.flat = false;
    item.floorY = context.groundY;
    item.gravity = SPRAY_GRAVITY;
    item.sizeStart = 1.4;
    item.sizeEnd = 0.45;
    item.spinRate = 0;
    item.stretch = 1;
    // Halved. The emission is now spatial like the wash (see WASH_SPACING), so
    // roughly three times as many puffs are on screen at once — the fix for
    // "four long cyan darts... evenly spaced and identically sized" is more of
    // them, not brighter ones, and additive brightness has to come down by the
    // same factor or the plume clips to a white slab.
    item.tint.copy(tint).multiplyScalar(isIce ? 0.55 : 0.46);
    item.ttl = ttl * (0.8 + Math.random() * 0.5);
    item.life = item.ttl;
  };

  // Rolling-contact wash, laid FLAT on the road under the rear tyres. This is
  // the package's whole thesis: a ground-aligned quad shares the road's plane,
  // so perspective, the horizon and the road's own texture all agree that it is
  // ON the surface, and there is no orientation from which it can read as an
  // object hanging in the air. It is also immune to the depth-slicing that
  // forced the old billboarded haze a metre off the ground — a quad parallel to
  // the plane it is lifted over cannot be cut by it.
  //
  // It hangs where it was laid rather than trailing the kart, so the wash marks
  // the line the tyres actually took.
  const spawnGroundWash = (context, look, tint, load, ttl) => {
    const item = nextSpray();
    const side = Math.random() < 0.5 ? -1 : 1;
    const cos = Math.cos(context.yaw);
    const sin = Math.sin(context.yaw);
    const lx = side * (3.9 + Math.random() * 1.4);
    const lz = -3.6 - Math.random() * 2.2;
    item.position.set(
      context.kartPosition.x + cos * lx + sin * lz,
      context.groundY + FLAT_LIFT,
      context.kartPosition.z - sin * lx + cos * lz
    );
    // Creeps outward off the contact patch — the wash widens behind the kart
    // the way a real dust trail does, rather than sitting in two parallel bands.
    const vx = side * (1.4 + Math.random() * 2.2) * look.grow;
    const vz = -(1 + Math.random() * 2);
    item.velocity.set(cos * vx + sin * vz, 0, -sin * vx + cos * vz);
    item.drag = 2.2;
    // Linear, not 1.4. The exponent used to be the wash's main dissolve because
    // the proximity ramp retired it early anyway; now that a flat quad lives all
    // the way to the lens (FLAT_PROX_FADE_*), a 1.4 exponent would spend 72% of
    // the value inside the first third of the life — which is the third that
    // sits behind the kart's own bodywork. The puff still reaches zero, and its
    // 0.16 s ttl is what stops the racing line accumulating a permanent film.
    item.fadeCurve = 1;
    item.flat = true;
    item.floorY = context.groundY - 1e3;
    item.gravity = 0;
    item.sizeStart = (1.8 + Math.random() * 1.1) * look.grow;
    item.sizeEnd = (3.6 + Math.random() * 1.8) * look.grow;
    item.spin = Math.random() * Math.PI * 2;
    item.spinRate = (Math.random() - 0.5) * 1.6;
    item.stretch = 0;
    // Very dim per particle by design — the read comes from a dozen of them
    // overlapping into one film, and any single one being legible is the
    // failure mode ("eight discrete warm lozenges lying across the asphalt",
    // wave2-r2/comeback-city-p0_24). The arctic value is higher because that
    // pool carries a 0.68 global opacity damper.
    //
    // Nudged up rather than down, unlike every other correction in this file.
    // The wave3-r1 measurement is unambiguous: at 0.085 the puff lifts a
    // (21,30,45) road by about 14 sRGB steps at its own core and nothing at its
    // edges, which is under the threshold at which anyone reads it as anything.
    // Density and the flat proximity window do most of the work here (together
    // ~2.5x the on-screen coverage); this is the last ~1.2x so the film is
    // legible without any single puff being so.
    //
    // `look.value` is the per-surface lift on top of that, and it is 1 on every
    // Comeback City surface by construction — the arctic road is 20-30 sRGB
    // steps darker than Miami asphalt, so the same additive puff that reads
    // there did not read here.
    item.tint.copy(tint).multiplyScalar((isIce ? 0.15 : 0.105) * look.value * (0.5 + load * 0.5));
    item.ttl = ttl * (0.85 + Math.random() * 0.3);
    item.life = item.ttl;
  };

  // The airborne half of rolling contact: displaced material that actually
  // leaves the ground. Rare on tarmac (`lift` 0.3), most of the emission on
  // snow — that split is what makes powder look like powder from a still.
  const spawnContactPlume = (context, look, tint, load, ttl) => {
    const item = nextSpray();
    const side = Math.random() < 0.5 ? -1 : 1;
    const cos = Math.cos(context.yaw);
    const sin = Math.sin(context.yaw);
    const lx = side * (4.1 + Math.random() * 1.1);
    const lz = -4.2 - Math.random() * 1.6;
    item.position.set(
      context.kartPosition.x + cos * lx + sin * lz,
      // Clear of the road plane: a camera-facing billboard that BLOOMS while
      // its centre sits on the surface has most of its lower half behind that
      // surface, and depthTest slices it on a dead-straight horizontal line —
      // a soft puff with one razor edge, the loudest "stray quad" tell there
      // is. The flat wash above owns the ground; this one owns the air.
      context.groundY + 1 + Math.random() * 0.6,
      context.kartPosition.z - sin * lx + cos * lz
    );
    const vx = side * (0.8 + Math.random() * 1.8) * look.grow;
    const vz = -(2 + Math.random() * 2.6);
    item.velocity.set(cos * vx + sin * vz, (1.2 + Math.random() * 2.4) * look.grow, -sin * vx + cos * vz);
    item.drag = 2.4;
    item.fadeCurve = 1.45;
    item.flat = false;
    item.floorY = context.groundY - 1;
    item.gravity = -1.4;
    item.sizeStart = 1.5 * look.grow;
    item.sizeEnd = (3.4 + Math.random() * 1.2) * look.grow;
    item.spinRate = 0;
    // Scrubbed road HANGS; it does not streak. Above ~0.25 the screen-velocity
    // term stretches each puff into a countable lozenge.
    item.stretch = 0.18;
    // The arctic value comes down as arcticTarmac's `lift` goes up: PV now
    // throws roughly two and a half times as many airborne puffs into the same
    // patch of screen, and unlike the wash these are additive BILLBOARDS that
    // overlap hard just behind the kart, where they have nothing foreshortening
    // them — so both tracks now sit at the value Comeback City was already
    // measured to be correct at. `look.value` then lifts the arctic looks alone
    // (it is 1 everywhere on Comeback City); see spawnGroundWash for why.
    item.tint.copy(tint).multiplyScalar(0.13 * look.value * (0.45 + load * 0.55));
    // Half again as long as the wash: this half of the emission has left the
    // ground, so it is still climbing when the wash under it has settled.
    item.ttl = ttl * (1.2 + Math.random() * 0.5);
    item.life = item.ttl;
  };

  // A flat ring of ground-aligned puffs pushed outward from a point on the
  // road. Shared by the landing puff and the spin-out shockwave: both are the
  // same physical event (something hit the surface hard) and both have to read
  // as a disturbance OF the road, which is precisely what the flat orientation
  // buys — a billboarded ring is just a scatter of balls.
  const spawnGroundRing = (context, { brightness = 1, count, radius, size, speed, tint, ttl = 0.45 }) => {
    // One shared phase per ring so the ring reads as a ring, plus per-particle
    // jitter so it does not read as a polygon.
    const phase = Math.random() * Math.PI * 2;
    for (let index = 0; index < count; index += 1) {
      const item = nextSpray();
      const angle = phase + (index / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const r = radius * (0.75 + Math.random() * 0.5);
      item.position.set(
        context.kartPosition.x + Math.cos(angle) * r,
        context.groundY + FLAT_LIFT,
        context.kartPosition.z + Math.sin(angle) * r
      );
      const out = speed * (0.7 + Math.random() * 0.6);
      item.velocity.set(Math.cos(angle) * out, 0, Math.sin(angle) * out);
      item.drag = 3.2;
      item.fadeCurve = 1.25;
      item.flat = true;
      item.floorY = context.groundY - 1e3;
      item.gravity = 0;
      item.sizeStart = size;
      item.sizeEnd = size * 2.4;
      item.spin = Math.random() * Math.PI * 2;
      item.spinRate = (Math.random() - 0.5) * 2.4;
      item.stretch = 0;
      item.tint.copy(tint).multiplyScalar(brightness);
      item.ttl = ttl * (0.8 + Math.random() * 0.4);
      item.life = item.ttl;
    }
  };

  // Landing puff: displaced ground from where the wheels hit, scaled by the
  // drop so a drift hop and a ramp landing do not look the same. The ring is
  // flat on the road; a few lifted puffs sit over it so the impact has volume
  // as well as a footprint.
  const spawnLandingPuff = (context, strength, look, tint) => {
    const ringCount = Math.round((mobile ? 7 : 12) * (0.45 + strength * 0.55));
    spawnGroundRing(context, {
      brightness: (isIce ? 0.62 : 0.5) * (0.6 + strength * 0.6),
      count: ringCount,
      radius: 3 + strength * 2.4,
      size: (2 + strength * 1.6) * look.grow,
      speed: 6 + strength * 12,
      tint,
      ttl: 0.42 + strength * 0.22,
    });
    // Lifted material scales harder with the drop than the footprint does — a
    // hop scuffs, a ramp landing throws.
    const airCount = Math.round((mobile ? 2 : 4) * (0.3 + strength * 1.2) * (0.6 + look.lift));
    for (let index = 0; index < airCount; index += 1) {
      const item = nextSpray();
      const angle = (index / Math.max(1, airCount)) * Math.PI * 2 + Math.random() * 0.8;
      const radius = 2.4 + Math.random() * 2.6;
      item.position.set(
        context.kartPosition.x + Math.cos(angle) * radius,
        context.groundY + 1 + Math.random() * 0.5,
        context.kartPosition.z + Math.sin(angle) * radius
      );
      // Outward and barely up — an impact displaces sideways, it does not
      // fountain.
      const out = (4 + strength * 7) * look.grow;
      item.velocity.set(Math.cos(angle) * out, 1.6 + strength * 3, Math.sin(angle) * out);
      item.drag = 3.4;
      item.fadeCurve = 1.35;
      item.flat = false;
      item.floorY = context.groundY - 1;
      item.gravity = -3;
      item.sizeStart = (1.3 + strength * 0.9) * look.grow;
      item.sizeEnd = (2.8 + strength * 1.6) * look.grow;
      item.spinRate = 0;
      item.stretch = 0.3;
      item.tint.copy(tint).multiplyScalar((isIce ? 0.72 : 0.6) * (0.5 + strength * 0.5));
      item.ttl = 0.4 + Math.random() * 0.3;
      item.life = item.ttl;
    }
  };

  // Sun-glint on ice: the surface itself sparkling, emitted in a band AHEAD of
  // and beside the kart rather than off the tyres, because it is a property of
  // the road and not of the car. Tiny and very short-lived — the whole read is
  // "the ice caught the light for a frame", and anything long enough to track
  // with your eye becomes a floating speck instead.
  const spawnGlint = (context) => {
    const cos = Math.cos(context.yaw);
    const sin = Math.sin(context.yaw);
    const lx = (Math.random() - 0.5) * 26;
    const lz = 8 + Math.random() * 42;
    const item = nextBurst();
    item.position.set(
      context.kartPosition.x + cos * lx + sin * lz,
      context.groundY + 0.2,
      context.kartPosition.z - sin * lx + cos * lz
    );
    // Static in the world: the sparkle belongs to a facet of the ice, so it is
    // the camera passing it that gives it motion.
    item.velocity.set(0, 0, 0);
    item.brightness = 0.55 + Math.random() * 0.6;
    item.flicker = 0;
    item.gravity = 0;
    item.size = 0.34 + Math.random() * 0.24;
    item.stretch = 0;
    item.stretchMax = BURST_STRETCH_MAX;
    item.tint.set('#EAF9FF');
    item.ttl = 0.1 + Math.random() * 0.12;
    item.life = item.ttl;
  };

  // Flung ice crystals: the half of arctic rolling contact that is NOT a puff.
  //
  // Three independent wave3-r2 critics reported the arctic frames showing "the
  // same grey tyre haze as Comeback City", and the reason is a shape problem
  // rather than a colour one: every particle either track threw was a soft
  // lobed puff off the same texture, so the two surfaces could only differ in
  // hue and headcount and neither survives a 900p still over a dark road. A
  // frozen surface does something tarmac physically cannot — it shatters — and
  // a hard, tiny, specular fleck is the one silhouette in this module that can
  // never be read as smoke. Drawn off the SOFT DOT (which has a bright core)
  // rather than the puff texture, and out of the burst pool, so it costs no
  // draw call and cannot starve the wash's slots.
  const spawnIceCrystal = (context, tint, load) => {
    const item = nextBurst();
    const side = Math.random() < 0.5 ? -1 : 1;
    const cos = Math.cos(context.yaw);
    const sin = Math.sin(context.yaw);
    const lx = side * (4.1 + Math.random() * 1.1);
    const lz = -3.5 - Math.random() * 1.4;
    item.position.set(
      context.kartPosition.x + cos * lx + sin * lz,
      context.groundY + 0.4 + Math.random() * 0.7,
      context.kartPosition.z - sin * lx + cos * lz
    );
    // Chipped off the contact patch: thrown out and back, and flat — a crystal
    // skips along the surface, it does not fountain. The heavy gravity is what
    // makes it fall back INTO the road within its own lifetime, which is the
    // difference between debris being displaced and debris being emitted.
    const vx = side * (2.6 + Math.random() * 4.2);
    const vz = -(2 + Math.random() * 4.5);
    item.velocity.set(cos * vx + sin * vz, 2.2 + Math.random() * 2.6, -sin * vx + cos * vz);
    // Well under a soft puff's, and it still out-reads one: the whole area is
    // concentrated in a core that clears the tonemap instead of being spread
    // over a lobed silhouette that averages into the road.
    item.brightness = (0.5 + load * 0.5) * (isIce ? 0.9 : 0.7);
    item.flicker = 0;
    item.gravity = -34;
    item.size = 0.2 + Math.random() * 0.16;
    // Streaked, but only a little: a crystal caught mid-flight is a short dash,
    // whereas a mini-turbo spark (stretch 1.6) is a full-length tracer. Keeping
    // them visibly different is what stops the surface cue from being mistaken
    // for a charge readout.
    item.stretch = 0.7;
    item.stretchMax = BURST_STRETCH_MAX;
    item.tint.copy(tint);
    item.ttl = 0.14 + Math.random() * 0.12;
    item.life = item.ttl;
  };

  const spawnBurst = (context, { color, count, gravity = -7.5, origin, originY, size, speed, spread = 0, stretch = 0, ttl, upBias }) => {
    const anchor = origin || context.kartPosition;
    const height = originY ?? context.groundY + 2.4;
    for (let index = 0; index < count; index += 1) {
      const item = nextBurst();
      const angle = (index / count) * Math.PI * 2 + Math.random() * 0.7;
      item.position.set(
        anchor.x + (Math.random() - 0.5) * spread,
        height,
        anchor.z + (Math.random() - 0.5) * spread
      );
      item.velocity.set(
        Math.cos(angle) * speed * (0.55 + Math.random() * 0.45),
        upBias + Math.random() * upBias,
        Math.sin(angle) * speed * (0.55 + Math.random() * 0.45)
      );
      // The pool is shared with the exhaust, which is the only emitter that
      // sets these — reset them or a recycled slot inherits a dim flickering
      // stub of a coin sparkle.
      item.brightness = 1;
      item.flicker = 0;
      item.stretchMax = BURST_STRETCH_MAX;
      item.gravity = gravity;
      item.size = size;
      item.stretch = stretch;
      item.tint.set(color);
      item.ttl = ttl * (0.75 + Math.random() * 0.5);
      item.life = item.ttl;
    }
  };

  // Directional burst. `dir` is in KART space (+z forward, +x right) and the
  // particles fire into a cone around it from a kart-space anchor, so a muzzle
  // flash comes off the nose pointing where the kart is pointing and a
  // mini-turbo release comes off the axle pointing backward. Radial bursts
  // (spawnBurst) read as an explosion at a point; these read as a thing being
  // FIRED, which is the whole difference between "an item happened" and "an
  // item happened in that direction".
  const spawnDirectionalBurst = (
    context,
    { aim = 1, anchor, brightness = 1, color, cone = 0.4, count, gravity = -6, size, speed, stretch = 1.6, ttl }
  ) => {
    const cos = Math.cos(context.yaw);
    const sin = Math.sin(context.yaw);
    const [ax, ay, az] = anchor;
    for (let index = 0; index < count; index += 1) {
      const item = nextBurst();
      const jx = ax + (Math.random() - 0.5) * 1.8;
      const jz = az + (Math.random() - 0.5) * 1.8;
      item.position.set(
        context.kartPosition.x + cos * jx + sin * jz,
        context.groundY + ay,
        context.kartPosition.z - sin * jx + cos * jz
      );
      // Cone around the aim axis, opened in kart space before the yaw rotation
      // so the spread follows the kart rather than the world. `aim` is +1 for
      // forward (a muzzle) and -1 for backward (a release).
      const swing = (Math.random() - 0.5) * cone * 2;
      const rise = (Math.random() - 0.5) * cone;
      const v = speed * (0.6 + Math.random() * 0.7);
      const vx = Math.sin(swing) * v;
      const vz = Math.cos(swing) * v * aim;
      // The small constant lift keeps a cone off the road plane for its whole
      // life; without it the lower half of every muzzle flash is under the
      // tarmac within two frames.
      item.velocity.set(cos * vx + sin * vz, rise * v + v * 0.12, -sin * vx + cos * vz);
      item.brightness = brightness;
      item.flicker = 0;
      item.gravity = gravity;
      item.size = size * (0.75 + Math.random() * 0.5);
      item.stretch = stretch;
      item.stretchMax = BURST_STRETCH_MAX;
      item.tint.set(color);
      item.ttl = ttl * (0.75 + Math.random() * 0.5);
      item.life = item.ttl;
    }
  };

  // Mini-turbo sparks. Distinct from the spray on purpose: tiny, fast, and
  // velocity-stretched, so the tier COLOUR (blue → amber → purple) is legible
  // from a single still frame the way the charge stage has to be.
  const spawnSpark = (context, tint) => {
    const item = nextBurst();
    const side = Math.random() < 0.5 ? -1 : 1;
    const cos = Math.cos(context.yaw);
    const sin = Math.sin(context.yaw);
    const lx = side * (4.3 + Math.random() * 0.8);
    const lz = -3.2 - Math.random() * 0.9;
    item.position.set(
      context.kartPosition.x + cos * lx + sin * lz,
      context.groundY + 0.55 + Math.random() * 0.5,
      context.kartPosition.z - sin * lx + cos * lz
    );
    // Pulled in from (5-12 lateral, 4-11 back, 4.5-8.5 up) and shortened from
    // 0.16-0.28 s. At 230 units/s a 0.28 s spark is 64 world units behind the
    // kart when it dies, i.e. it has crossed the chase boom and swept past the
    // lens — which is exactly the frame the critics read as "large detached
    // cyan lozenges scattered a full kart-width off the wheels"
    // (comeback-city-p0_33). A spark is a charge readout: it belongs ON the
    // tyre, and anything that outlives the contact patch is noise.
    const vx = side * (3 + Math.random() * 4.5);
    const vz = -(2.5 + Math.random() * 4);
    item.velocity.set(cos * vx + sin * vz, 3.4 + Math.random() * 3, -sin * vx + cos * vz);
    item.brightness = 1;
    item.flicker = 0;
    item.stretchMax = BURST_STRETCH_MAX;
    item.gravity = -26;
    item.size = 0.34 + Math.random() * 0.26;
    item.stretch = 1.6;
    item.tint.copy(tint);
    item.ttl = 0.11 + Math.random() * 0.08;
    item.life = item.ttl;
  };

  // Boost exhaust. TWO sprites per emission off one nozzle: a small white-hot
  // core and a wider, much dimmer shell blowing back off it. The single-sprite
  // version this replaces was the "opaque warm-brown stick lying on the road"
  // the critics read in wave1-r3 and again in wave2-r1 — and the arithmetic
  // agreed with them: ~2 world units wide at the shared 5.5x length cap is a
  // 13-unit rod, a dozen alive at once, every one of them at full additive
  // brightness, anchored low enough to share the asphalt's screen space. Each
  // of those three causes is addressed here (nozzle height, per-particle length
  // cap, per-particle brightness) rather than by dimming the whole system,
  // because the plume still has to be the one thing in frame that legitimately
  // clears the bloom knee — that is what the core is for.
  const spawnFlame = (context, tint) => {
    const side = Math.random() < 0.5 ? -1 : 1;
    const cos = Math.cos(context.yaw);
    const sin = Math.sin(context.yaw);
    const lx = side * 2.4 + (Math.random() - 0.5) * 0.7;
    // Pulled in from -6.2: the diffuser, not a point trailing past the wing.
    const lz = -5.6 - Math.random() * 0.5;
    const x = context.kartPosition.x + cos * lx + sin * lz;
    const z = context.kartPosition.z - sin * lx + cos * lz;
    const y =
      Math.max(context.groundY + FLAME_MIN_CLEARANCE, context.kartPosition.y + FLAME_NOZZLE_Y) +
      (Math.random() - 0.5) * 0.3;
    const vz = -(15 + Math.random() * 8);
    const vx = (Math.random() - 0.5) * 2.6;
    // Strictly upward, where the old spread could be -0.66: with gravity at 0
    // a downward component never recovers, so a fraction of every plume drifted
    // into the road plane and stayed there for its whole life.
    const vy = 0.6 + Math.random() * 1.4;
    const wx = cos * vx + sin * vz;
    const wz = -sin * vx + cos * vz;

    const shell = nextBurst();
    shell.position.set(x, y, z);
    shell.velocity.set(wx, vy, wz);
    // No gravity: thrust decelerates into the air behind the kart, it does not
    // fall.
    shell.gravity = 0;
    // 0.34 -> 0.14 and the core 1 -> 0.38, against a 2.7x emission rate: the
    // SUM the camera sees is what the plume IS, so both are set to hold the
    // total within a few percent (shells 13.6 -> 14.8 units/s, cores 40 ->
    // 40.3) while no single sprite stays legible enough to read as an object.
    shell.brightness = 0.14;
    shell.flicker = Math.random() * Math.PI * 2;
    shell.size = 1.15 + Math.random() * 0.45;
    shell.stretch = 1.6;
    shell.stretchMax = FLAME_SHELL_STRETCH_MAX;
    shell.tint.copy(tint);
    shell.ttl = FLAME_TTL * (0.8 + Math.random() * 0.5);
    shell.life = shell.ttl;

    // ~0.35 of the shell and slower, so it stays at the nozzle while the shell
    // blows past it — that velocity difference is the whole cone read.
    const core = nextBurst();
    core.position.set(x, y, z);
    core.velocity.set(wx * 0.68, vy * 0.68, wz * 0.68);
    core.gravity = 0;
    core.brightness = 0.38;
    core.flicker = Math.random() * Math.PI * 2;
    core.size = 0.42 + Math.random() * 0.16;
    core.stretch = 0.9;
    core.stretchMax = FLAME_CORE_STRETCH_MAX;
    core.tint.copy(FLAME_CORE);
    core.ttl = FLAME_TTL * 0.7;
    core.life = core.ttl;
  };

  // Off-boost exhaust: one dim puff at a low, speed-linked rate so the kart is
  // always shedding SOMETHING. Without it the only frames in which the kart
  // emits anything are drift and boost frames, and a vehicle that is inert for
  // most of a lap reads as a prop being slid along the road. This is furniture,
  // not an event — a third of the idle rate and an eighth of the brightness of
  // the boost plume, and no core, so it can never compete with a real boost.
  const spawnIdleFlame = (context, tint) => {
    const side = Math.random() < 0.5 ? -1 : 1;
    const cos = Math.cos(context.yaw);
    const sin = Math.sin(context.yaw);
    const lx = side * 2.4 + (Math.random() - 0.5) * 0.6;
    const lz = -5.5 - Math.random() * 0.4;
    const item = nextBurst();
    item.position.set(
      context.kartPosition.x + cos * lx + sin * lz,
      Math.max(context.groundY + FLAME_MIN_CLEARANCE, context.kartPosition.y + FLAME_NOZZLE_Y) +
        (Math.random() - 0.5) * 0.25,
      context.kartPosition.z - sin * lx + cos * lz
    );
    const vz = -(5 + Math.random() * 4);
    const vx = (Math.random() - 0.5) * 1.6;
    item.velocity.set(cos * vx + sin * vz, 1 + Math.random() * 1.2, -sin * vx + cos * vz);
    item.brightness = IDLE_FLAME_BRIGHTNESS;
    item.flicker = Math.random() * Math.PI * 2;
    item.gravity = 0;
    item.size = 0.55 + Math.random() * 0.3;
    item.stretch = 1.1;
    item.stretchMax = FLAME_SHELL_STRETCH_MAX;
    item.tint.copy(tint);
    item.ttl = IDLE_FLAME_TTL * (0.7 + Math.random() * 0.6);
    item.life = item.ttl;
  };

  // Cue router — cue names come from kartAudio.cuesForTransition verbatim, so
  // the frame a burst fires on is the frame its sound plays on by construction.
  //
  // Every entry below is a different SHAPE, not a different colour of the same
  // ball: a pickup implodes, a use fires forward, a release fires backward, a
  // spin-out puts a ring on the road. That is what lets a viewer name the event
  // from a still — which is the acceptance bar for this package.
  const onCue = (cue, context) => {
    if (cue === 'coin') {
      spawnBurst(context, {
        color: '#FFD34F',
        count: mobile ? 5 : 7,
        size: 0.9,
        speed: 5.5,
        ttl: 0.5,
        upBias: 4.2,
      });
    } else if (cue === 'coin-loss') {
      // Spilt coins: same gold, but thrown hard and OUT with real gravity, so
      // losing them looks like losing them rather than like collecting them.
      spawnBurst(context, {
        color: '#FFC53F',
        count: mobile ? 6 : 10,
        gravity: -26,
        originY: context.groundY + 1.8,
        size: 0.75,
        speed: 12,
        spread: 3,
        stretch: 1.2,
        ttl: 0.6,
        upBias: 6,
      });
    } else if (cue === 'item-pickup') {
      // Implosion: motes born on a ring and thrown INWARD, so the item reads as
      // being absorbed by the kart. Nothing else in the module moves inward,
      // which is the whole point.
      lastItemTint = itemTintFor(context.heldItem);
      const count = mobile ? 6 : 9;
      const cos = Math.cos(context.yaw);
      const sin = Math.sin(context.yaw);
      for (let index = 0; index < count; index += 1) {
        const angle = (index / count) * Math.PI * 2 + Math.random() * 0.4;
        const radius = 5.5 + Math.random() * 2.5;
        const lx = Math.cos(angle) * radius;
        const lz = Math.sin(angle) * radius;
        const item = nextBurst();
        item.position.set(
          context.kartPosition.x + cos * lx + sin * lz,
          context.groundY + 1.6 + Math.random() * 2.4,
          context.kartPosition.z - sin * lx + cos * lz
        );
        const pull = 11 + Math.random() * 5;
        item.velocity.set(-(cos * lx + sin * lz) / radius * pull, 1.6, -(-sin * lx + cos * lz) / radius * pull);
        item.brightness = 1;
        item.flicker = 0;
        item.gravity = 0;
        item.size = 0.6;
        item.stretch = 1.3;
        item.stretchMax = BURST_STRETCH_MAX;
        item.tint.set(lastItemTint);
        item.ttl = 0.3 + Math.random() * 0.12;
        item.life = item.ttl;
      }
    } else if (cue === 'item-use') {
      // Muzzle cone off the nose in the accent of the item that just left.
      spawnDirectionalBurst(context, {
        aim: 1,
        anchor: [0, 2, 5.4],
        color: lastItemTint,
        cone: 0.5,
        count: mobile ? 8 : 13,
        gravity: -4,
        size: 0.85,
        speed: 22,
        stretch: 1.8,
        ttl: 0.24,
      });
    } else if (cue === 'spin-out') {
      spawnBurst(context, {
        color: isIce ? '#e8f4ff' : '#d9dfec',
        count: mobile ? 7 : 10,
        size: 1.7,
        speed: 4.2,
        ttl: 0.75,
        upBias: 2.2,
      });
      // ...plus a shockwave ON the road. The airborne burst alone reads as a
      // puff floating over the kart; the ring is what says the kart hit
      // something and the surface felt it.
      spawnGroundRing(context, {
        brightness: isIce ? 0.7 : 0.55,
        count: mobile ? 8 : 14,
        radius: 3,
        size: 3 * currentLook.grow,
        speed: 26,
        tint: groundTint,
        ttl: 0.5,
      });
    } else if (cue.startsWith('tier-')) {
      // The moment the charge banks a stage. Small on purpose — the loud beat
      // belongs to the release, and a big flash here would spend it early.
      // Fired through the wheel emitter rather than as a radial ball at the
      // kart's centre: the charge lives in the tyres, so the flash has to as
      // well or it reads as a floating pop.
      sparkTint.set(DRIFT_FEEL.sparkColors[Math.min(3, Number(cue.slice(5)) || 1)]);
      for (let index = 0; index < (mobile ? 5 : 8); index += 1) spawnSpark(context, sparkTint);
    } else if (cue.startsWith('mini-turbo-')) {
      // Release. The one frame in a corner that has to punch: a cone of tier
      // sparks fired BACKWARD off the rear axle (the kart is being shoved
      // forward, so the reaction mass goes the other way), a flat kick ring on
      // the road, and a rising edge on the speed-line envelope so the screen
      // effect and the kart effect fire on the same beat.
      const releaseTier = Math.min(3, Number(cue.slice(11)) || 1);
      spawnDirectionalBurst(context, {
        aim: -1,
        anchor: [0, 1.6, -4.6],
        color: DRIFT_FEEL.sparkColors[releaseTier],
        cone: 0.55,
        count: mobile ? 10 : 16,
        gravity: -14,
        size: 0.9 + releaseTier * 0.16,
        speed: 16 + releaseTier * 4,
        stretch: 2,
        ttl: 0.3,
      });
      spawnGroundRing(context, {
        brightness: 0.5,
        count: mobile ? 5 : 9,
        radius: 2.6,
        size: 2.6 * currentLook.grow,
        speed: 18,
        tint: groundTint,
        ttl: 0.34,
      });
      // Scaled by overspeed for the same reason update()'s own rising edge is:
      // a release out of a slow hairpin has nothing to streak past yet, so the
      // screen field would be painting motion the frame does not contain. The
      // floor is high (0.55) because the release still has to punch — this only
      // stops a standing-start tier 3 from filling the frame.
      boostPunch = Math.max(boostPunch, (0.6 + releaseTier * 0.13) * (0.55 + 0.45 * lastOverspeed));
    } else if (cue === 'boost') {
      // Pad boost. Quieter than a mini-turbo release — no ring, no tier colour
      // — but it still has to have an instant, or the only evidence a pad did
      // anything is the speed readout.
      spawnDirectionalBurst(context, {
        aim: -1,
        anchor: [0, 1.8, -4.6],
        brightness: 0.8,
        color: PAD_BOOST_TINT,
        cone: 0.45,
        count: mobile ? 6 : 10,
        gravity: -8,
        size: 0.8,
        speed: 14,
        stretch: 1.8,
        ttl: 0.26,
      });
    } else if (cue === 'land') {
      // Landing is the one cue that carries data the caller does not send:
      // how far the kart fell. update() banks the peak, this spends it, and
      // clearing wasAirborne here is what keeps update()'s own edge detector
      // (the fallback for a caller that never feeds cues) from double-firing.
      if (peakAirHeight > LANDING_MIN_DROP) {
        spawnLandingPuff(context, clamp01((peakAirHeight - LANDING_MIN_DROP) / 7), currentLook, groundTint);
      }
      peakAirHeight = 0;
      wasAirborne = false;
    }
  };

  const laySkidSegment = (context, step) => {
    const cos = Math.cos(context.yaw);
    const sin = Math.sin(context.yaw);
    const nx = cos * SKID_HALF_WIDTH;
    const nz = -sin * SKID_HALF_WIDTH;
    [-1, 1].forEach((side, wheelIndex) => {
      const lx = side * 4.6;
      const lz = -3.3;
      const cx = context.kartPosition.x + cos * lx + sin * lz;
      const cz = context.kartPosition.z - sin * lx + cos * lz;
      const trail = skidTrails[wheelIndex];
      if (trail) {
        const stepX = cx - trail.cx;
        const stepZ = cz - trail.cz;
        if (stepX * stepX + stepZ * stepZ < step * step) return;
        const quad = skidCursor;
        skidCursor = (skidCursor + 1) % skidQuads;
        skidCursorMoved = true;
        skidY[quad] = context.groundY + SKID_LIFT + (quad % 4) * 0.004;
        skidSpine.set([trail.cx, trail.cz, trail.nx, trail.nz, cx, cz, nx, nz], quad * 8);
        writeSkidQuad(quad, 1);
        for (let vert = 0; vert < 4; vert += 1) {
          skidColors.set([skidTone.r, skidTone.g, skidTone.b, 0], (quad * 4 + vert) * 4);
        }
        skidAges[quad] = 0;
        skidGeometry.attributes.position.needsUpdate = true;
      }
      skidTrails[wheelIndex] = { cx, cz, nx, nz };
    });
  };

  const update = (context) => {
    const { camera, dt } = context;
    clock = (clock + dt) % 1000;
    camera.getWorldQuaternion(scratchQuaternion);
    inverseCameraQuaternion.copy(scratchQuaternion).invert();
    // camera.matrixWorldInverse is only rebuilt inside render(), so it cannot
    // be trusted from the update pass — everything camera-space below rides
    // this one inversion.
    scratchView.copy(camera.matrixWorld).invert();
    camera.getWorldPosition(cameraPosition);
    if (hasPrevCamera && dt > 0) {
      scratchRel.copy(cameraPosition).sub(prevCameraPosition).divideScalar(dt);
      // A respawn or a camera cut teleports the boom; a 400-unit/s spike there
      // would smear every live particle into a full-screen streak for one frame.
      if (scratchRel.lengthSq() < 400 * 400) cameraVelocity.copy(scratchRel);
    }
    prevCameraPosition.copy(cameraPosition);
    hasPrevCamera = true;
    if (camera.isPerspectiveCamera) focalLength = camera.projectionMatrix.elements[5];

    if (hasPrevKart && dt > 0) {
      const instant = prevKartPosition.distanceTo(context.kartPosition) / dt;
      // A lap wrap or respawn teleports the kart; ignore the resulting spike.
      if (instant < 400) measuredSpeed += (instant - measuredSpeed) * Math.min(1, dt * 8);
    }
    prevKartPosition.copy(context.kartPosition);
    hasPrevKart = true;
    // speed and maxSpeed arrive together or not at all — taking one without
    // the other would silently compare two different unit scales.
    const hasSpeedContract = Number.isFinite(context.speed) && Number.isFinite(context.maxSpeed) && context.maxSpeed > 0;
    const speed = hasSpeedContract ? Math.abs(context.speed) : measuredSpeed;
    const maxSpeed = hasSpeedContract ? context.maxSpeed : FALLBACK_MAX_SPEED;
    // Surface resolution. `context.surface` is the road package's band type;
    // `context.offRoad` is the boolean its rumble/verge work may or may not
    // have landed by the time this runs, so it is read optionally and an
    // unknown band name aliases rather than silently becoming tarmac.
    const look = resolveSurfaceLook(context.surface, context.offRoad, isIce);
    currentLook = look;
    surfaceTint.set(look.tint);
    const emitScale = (context.reducedMotion ? 0.5 : 1) * poolScale;

    // Boost envelope. Computed before the emitters because the exhaust rate
    // rides it: an EVENT, not furniture — fast attack, slow release, gated by
    // an overspeed term so a boost you were already at top speed for is the
    // only thing that fills the frame.
    const boosting = Boolean(context.boosting);
    const over = clamp01((speed - 0.8 * maxSpeed) / (0.3 * maxSpeed));
    lastOverspeed = over;
    const want = boosting ? over : 0;
    // The rising edge punches, but a boost taken from a standing start has
    // nothing to streak past yet — scale the punch by the overspeed too. Never
    // lower than what a cue already asked for: the mini-turbo release fires on
    // the same frame this edge does, and it is the bigger event of the two.
    if (boosting && !wasBoosting) boostPunch = Math.max(boostPunch, 0.35 + 0.65 * over);
    wasBoosting = boosting;
    boostPunch = Math.max(0, boostPunch - dt / 0.14);
    const attack = want > boostEnergy ? dt / 0.07 : dt / 0.26;
    boostEnergy += Math.sign(want - boostEnergy) * Math.min(attack, Math.abs(want - boostEnergy));

    // Displaced material, not paint: the tier hue survives on tarmac (where
    // the spray is tyre smoke) but a powder surface washes it toward the
    // ground's own colour, because a saturated cyan jet of snow reads as a
    // paint spray. isIce is the floor — Penguin Village is white underfoot
    // even on the stretches the surface bands call asphalt. Resolved before
    // the emitters because each particle now banks its own colour at spawn.
    sprayTint.set(DRIFT_FEEL.sparkColors[context.tier] || DRIFT_FEEL.sparkColors[0]);
    const sprayPowder = Math.max(look.powder, isIce ? ICE_SPRAY_POWDER : 0);
    if (sprayPowder > 0) {
      sprayTint.lerp(sprayPowder >= 1 ? surfaceTint : SPRAY_SNOW, sprayPowder * 0.65);
    }
    // The contact wash and the landing puff are pure displaced ground, so they
    // took the surface tint RAW — and Penguin Village's surface bands still
    // call most of the lap "asphalt", whose tint is a warm tan. Measured on
    // wave2-r2/penguin-village-p0_24 (x 530-570, y 800-855): the haze streaks
    // land at (71,66,63) over a (21,30,45) road, i.e. red above blue on a track
    // whose entire identity is that it is blue underfoot. The spray already
    // solves this with `powder`; the ground systems have to obey the same term
    // or an ice track throws desert dust. A HIGHER floor than the spray's
    // (ICE_GROUND_POWDER) because there is no tier colour here that has to
    // survive the wash — on an arctic track the ground is white, full stop.
    const groundPowder = Math.max(look.powder, isIce ? ICE_GROUND_POWDER : 0);
    groundTint.copy(surfaceTint);
    if (groundPowder > 0) groundTint.lerp(SPRAY_SNOW, groundPowder * 0.8);

    // Spray: emit while drifting on the ground, tier raises the density.
    // Spatial like the wash, and for the same measured reason — at 44+22/tier
    // per second only three to eight puffs were ever on screen at racing speed,
    // which is why the drift plume was being read as individual "shards".
    // Its lifetime keeps a higher floor than the wash's: the spray is ballistic
    // and needs enough time to actually arc.
    const spraying = context.drifting && !context.airborne;
    if (spraying) {
      // `linger` here as well as on the wash: a drift plume of powder that dies
      // on the same clock as a plume of tyre smoke is the single clearest way
      // for two surfaces to look identical while being coloured differently.
      const sprayTtl =
        Math.min(0.7, Math.max(0.28, (WASH_WINDOW * 1.4) / Math.max(30, speed))) * look.linger;
      sprayAccumulator +=
        dt *
        Math.min(mobile ? 200 : 460, (speed / WASH_SPACING) * (0.62 + context.tier * 0.28) * emitScale);
      let budget = mobile ? 8 : 16;
      while (sprayAccumulator >= 1 && budget > 0) {
        sprayAccumulator -= 1;
        budget -= 1;
        spawnSpray(context, sprayTint, sprayTtl);
      }
      if (budget <= 0) sprayAccumulator = 0;
    } else {
      sprayAccumulator = 0;
    }

    // Rolling contact. THE grounding system: it runs on every surface, at every
    // speed above that surface's own gate, drifting or not. Tarmac wisps from
    // about three-quarter throttle; snow and dirt displace from a crawl, and
    // that difference in GATE is most of what tells one surface from another in
    // a still frame — a track you can name from the dust is a track the kart is
    // attached to.
    //
    // It runs during a drift as well now, unlike the haze it replaces. The
    // spray is thrown material, arcing up and back; the wash is the contact
    // patch itself, and the wheels are still touching the road mid-drift. What
    // stops the two doubling up is the rate term below, which halves while the
    // spray is running.
    const contactGate = look.gate;
    const contactLoad = clamp01((speed / maxSpeed - contactGate) / Math.max(0.05, 1 - contactGate));
    // Not zeroed under reducedMotion, unlike the old haze — see the policy note
    // at the top of the file: after this wave the wash is the surface readout.
    const contacting = !context.airborne && contactLoad > 0;
    if (contacting) {
      // Spatial, not temporal (see WASH_SPACING): the emission is a function of
      // how much road went under the tyres this frame.
      const washTtl = washTtlFor(speed) * look.linger;
      // Capped so the worst case (off-road at racing speed, density 1.8) cannot
      // starve the drift spray, which draws from the same pool. Measured in the
      // steady state with both running at tier 3: 66 spray-pool sprites drawn
      // of 208 desktop, 35 of 96 mobile.
      const rate = Math.min(
        mobile ? 150 : 420,
        (speed / WASH_SPACING) *
          look.density *
          (0.45 + contactLoad * 0.55) *
          (spraying ? 0.5 : 1) *
          (context.reducedMotion ? 0.4 : 1) *
          poolScale
      );
      contactAccumulator += dt * rate;
      // Hard ceiling per frame. A frame-time spike (tab restore, first frame
      // after a load) would otherwise dump a whole second of emission into one
      // instant and recycle every live particle in the pool.
      let budget = mobile ? 8 : 16;
      while (contactAccumulator >= 1 && budget > 0) {
        contactAccumulator -= 1;
        budget -= 1;
        // `lift` splits the emission between the ground wash and the airborne
        // plume. Tarmac is almost all wash (smoke does not leave the surface
        // for long); snow is half plume, which is what powder looks like.
        if (Math.random() < look.lift) spawnContactPlume(context, look, groundTint, contactLoad, washTtl);
        else spawnGroundWash(context, look, groundTint, contactLoad, washTtl);
      }
      if (budget <= 0) contactAccumulator = 0;

      // Crystals ride the same contact event as the wash — same gate, same
      // load, spatial rate for the same reason — but out of the BURST pool, so
      // however hard a snow bank is throwing powder it can never eat the slots
      // the drift spray needs. Halved under reducedMotion rather than killed:
      // this is the surface readout, not ambience (see the policy note at the
      // top of the file).
      if (look.crystal > 0) {
        crystalAccumulator +=
          dt *
          Math.min(mobile ? 40 : 90, (speed / WASH_SPACING) * 0.18 * look.crystal * (0.4 + contactLoad * 0.6)) *
          emitScale;
        let crystalBudget = mobile ? 3 : 6;
        while (crystalAccumulator >= 1 && crystalBudget > 0) {
          crystalAccumulator -= 1;
          crystalBudget -= 1;
          spawnIceCrystal(context, CRYSTAL_TINT, contactLoad);
        }
        if (crystalBudget <= 0) crystalAccumulator = 0;
      } else {
        crystalAccumulator = 0;
      }
    } else {
      contactAccumulator = 0;
      crystalAccumulator = 0;
    }

    // Ice glint. Purely decorative sparkle ON the road, so reducedMotion kills
    // it outright and it never fires while the wash is already busy throwing
    // powder over the same pixels.
    if (look.glint && !context.reducedMotion && !spraying) {
      glintAccumulator += dt * (mobile ? 9 : 16) * look.glint * poolScale;
      while (glintAccumulator >= 1) {
        glintAccumulator -= 1;
        spawnGlint(context);
      }
    } else {
      glintAccumulator = 0;
    }

    // Landing puff fallback. `land` (onCue) is the primary path because it is
    // the frame the audio lands on; this covers a caller that feeds no cues at
    // all, and onCue clears wasAirborne so the two can never both fire.
    const airborne = Boolean(context.airborne);
    if (airborne) {
      peakAirHeight = Math.max(peakAirHeight, context.kartPosition.y - context.groundY);
    } else if (wasAirborne) {
      if (peakAirHeight > LANDING_MIN_DROP) {
        spawnLandingPuff(context, clamp01((peakAirHeight - LANDING_MIN_DROP) / 7), look, groundTint);
      }
      peakAirHeight = 0;
    }
    wasAirborne = airborne;

    let sprayColorDirty = false;
    sprayPool.forEach((item, index) => {
      if (item.life <= 0) {
        sprayMesh.setMatrixAt(index, HIDDEN_POSE);
        return;
      }
      item.life -= dt;
      item.velocity.y += item.gravity * dt;
      if (item.drag > 0) item.velocity.multiplyScalar(Math.max(0, 1 - item.drag * dt));
      item.position.addScaledVector(item.velocity, dt);
      // Against the ground it was BORN over, not the ground under the kart now
      // — otherwise climbing the track kills the trail the kart just laid.
      if (item.position.y < item.floorY + 0.1) item.life = 0;
      const fade = Math.max(0, item.life / item.ttl);
      // Stretch along the sprite's SCREEN motion, which is dominated by the
      // camera closing on it, not by the velocity it was thrown at.
      const depth = screenVelocityOf(item.position, item.velocity);
      const prox = proximityAt(depth, item.flat);
      if (prox <= 0.001) {
        // prox only reaches zero inside PROX_FADE_GONE, i.e. the particle is at
        // the lens or already behind it — and the camera never reverses down
        // the track, so it can never be seen again. Retire it rather than
        // parking it: at racing speed a particle spends two thirds of its
        // lifetime in this state, and freeing the slot is what keeps the pool
        // from recycling particles that are still on screen.
        item.life = 0;
        sprayMesh.setMatrixAt(index, HIDDEN_POSE);
        return;
      }
      const screenSpeed = scratchScreenVelocity.length();
      // Two independent limits: the proximity ramp handles the normal sweep
      // past the lens, the angular cap catches anything spawned or blown
      // unusually close that the ramp has not started on yet. A ground-aligned
      // quad gets three times the allowance — it is foreshortened into the road
      // and cannot balloon into the frame the way a billboard can, and at the
      // billboard cap the wash's whole `grow` range would be clamped away at
      // every depth the player actually sees it.
      const width = Math.min(
        (item.sizeEnd + (item.sizeStart - item.sizeEnd) * fade) * prox,
        depth * MAX_SPRITE_ANGLE * (item.flat ? 3 : 1)
      );
      if (width < depth * MIN_SPRITE_ANGLE) {
        sprayMesh.setMatrixAt(index, HIDDEN_POSE);
        return;
      }
      if (item.flat) {
        // Ground-aligned: no billboard, no velocity stretch (a flat quad's
        // apparent motion is already the road's own parallax), and a slow yaw
        // so the wash never resolves into a grid of identical rectangles.
        item.spin += item.spinRate * dt;
        scratchScale.set(width, width, 1);
        scratchRoll.setFromAxisAngle(Y_AXIS, item.spin).multiply(FLAT_QUAT);
      } else {
        const stretch = 1 + Math.min(2.4, screenSpeed * 1.1 * item.stretch);
        scratchScale.set(width, width * stretch, 1);
        // Below a pixel or two of travel the direction is numerically junk and
        // the sprite should stay round anyway.
        const roll = screenSpeed > 0.02 ? Math.atan2(scratchScreenVelocity.y, scratchScreenVelocity.x) - Math.PI / 2 : 0;
        scratchRoll.setFromAxisAngle(Z_AXIS, roll).premultiply(scratchQuaternion);
      }
      sprayMesh.setMatrixAt(index, scratchMatrix.compose(item.position, scratchRoll, scratchScale));
      // Fade brightness as well as size — a sprite that only shrinks pops out.
      // Under additive blending brightness IS opacity, so this is a real
      // dissolve on both tracks and the proximity term applies on both.
      sprayMesh.setColorAt(
        index,
        scratchColor.copy(item.tint).multiplyScalar(Math.pow(fade, item.fadeCurve) * prox)
      );
      sprayColorDirty = true;
    });
    sprayMesh.instanceMatrix.needsUpdate = true;
    if (sprayColorDirty) sprayMesh.instanceColor.needsUpdate = true;

    // Skids: lay while drifting on the ground; a break in the drift breaks
    // the trail. The step scales with speed so a slow hairpin still gets a
    // smooth arc while a full-speed drift still covers a whole corner.
    skidCursorMoved = false;
    if (spraying) {
      laySkidSegment(context, THREE.MathUtils.clamp(speed * 0.016, SKID_STEP_MIN, SKID_STEP_MAX));
    } else {
      skidTrails[0] = skidTrails[1] = null;
    }
    let skidDirty = false;
    let skidPositionsDirty = false;
    const skidTailStart = skidQuads - SKID_TAIL_QUADS;
    for (let quad = 0; quad < skidQuads; quad += 1) {
      if (skidAges[quad] > SKID_FADE_SECONDS) continue;
      skidAges[quad] += dt;
      // Distance behind the write head, in ring slots: 1 is the quad laid this
      // step, skidQuads is the one the head is about to overwrite.
      const slotsBehind = ((skidCursor - quad - 1 + skidQuads) % skidQuads) + 1;
      // Head ramp hides the pop as each new quad lands behind the tyre; tail
      // ramp means the ring recycles into nothing instead of a hard edge.
      const head = Math.min(1, slotsBehind / SKID_HEAD_QUADS);
      const tail = slotsBehind > skidTailStart ? (slotsBehind - skidTailStart) / SKID_TAIL_QUADS : 0;
      const alpha = Math.max(0, skidBaseAlpha * (1 - skidAges[quad] / SKID_FADE_SECONDS) * head * (1 - tail));
      for (let vert = 0; vert < 4; vert += 1) skidColors[(quad * 4 + vert) * 4 + 3] = alpha;
      skidDirty = true;
      if (tail > 0 && skidCursorMoved) {
        // Narrow the oldest quads to a point so the trail ends like rubber
        // running out, not like a cut.
        writeSkidQuad(quad, 1 - SKID_TAIL_PINCH * tail);
        skidPositionsDirty = true;
      }
    }
    if (skidDirty) skidGeometry.attributes.color.needsUpdate = true;
    if (skidPositionsDirty) skidGeometry.attributes.position.needsUpdate = true;

    // Mini-turbo sparks: only once a tier is actually banked, so the frame
    // never shows a colour the player has not earned.
    const tier = Math.min(3, Math.max(0, context.miniTurboTier | 0));
    const sparking = spraying && context.tier >= 1;
    if (sparking) {
      sparkAccumulator += dt * (26 + context.tier * 20) * emitScale;
      sparkTint.set(DRIFT_FEEL.sparkColors[context.tier] || DRIFT_FEEL.sparkColors[1]);
      while (sparkAccumulator >= 1) {
        sparkAccumulator -= 1;
        spawnSpark(context, sparkTint);
      }
    } else {
      sparkAccumulator = 0;
    }

    // Exhaust rides the same envelope as the speed-lines, so the thrust on the
    // kart and the streaks in the frame start and stop on the same beat.
    const boosted = boostEnergy > 0.08;
    if (boosted) {
      // Raised from 16+24, with the per-sprite brightness dropped to match in
      // spawnFlame. The old rate simply could not fill a cone: a plume sprite
      // falls away from the kart at ~300 units/s, so it crosses the visible
      // depth band (26 -> 11, see FLAT_PROX_FADE_*) in 47 ms and 40/s leaves
      // TWO shells on screen. That is the three detached warm pills lying over
      // the road in penguin-village-p0_56, not a cone of gas. Same lesson the
      // drift spray already learned: the fix for "countable objects" is more of
      // them and dimmer, never fewer and brighter. ~15 of a 160-slot pool in
      // the steady state, since the proximity ramp retires each after ~70 ms.
      flameAccumulator += dt * (44 + boostEnergy * 62) * emitScale;
      sparkTint.set(tier >= 1 ? DRIFT_FEEL.sparkColors[tier] : EXHAUST_TINT);
      if (EXHAUST_TIER_PULL > 0 && tier >= 1) sparkTint.lerp(EXHAUST_COLOR, EXHAUST_TIER_PULL);
      // Frame-time spikes would otherwise dump a whole second of emission into
      // one instant and recycle the pool; two sprites go out per iteration.
      let budget = mobile ? 6 : 12;
      while (flameAccumulator >= 1 && budget > 0) {
        flameAccumulator -= 1;
        budget -= 1;
        spawnFlame(context, sparkTint);
      }
      if (budget <= 0) flameAccumulator = 0;
    } else if (!context.reducedMotion && speed > 0.12 * maxSpeed) {
      // Idle exhaust so the kart is never inert. Rate rises gently with speed —
      // it is engine load, not a cue — and stays an order of magnitude below
      // the boost plume so a boost is still unambiguous.
      flameAccumulator += dt * (2.5 + (speed / maxSpeed) * 5) * poolScale;
      sparkTint.set(EXHAUST_TINT);
      while (flameAccumulator >= 1) {
        flameAccumulator -= 1;
        spawnIdleFlame(context, sparkTint);
      }
    } else {
      flameAccumulator = 0;
    }

    // Bursts: ballistic, camera-billboarded, shrink out.
    let burstColorDirty = false;
    burstPool.forEach((item, index) => {
      if (item.life <= 0) {
        burstMesh.setMatrixAt(index, HIDDEN_POSE);
        return;
      }
      item.life -= dt;
      item.velocity.y += item.gravity * dt;
      item.position.addScaledVector(item.velocity, dt);
      const fade = Math.max(0, item.life / item.ttl);
      const depth = screenVelocityOf(item.position, item.velocity);
      // Every burst emitter is camera-billboarded, so the tight window applies.
      const prox = proximityAt(depth, false);
      if (prox <= 0.001) {
        // Same retirement rule as the spray pool above.
        item.life = 0;
        burstMesh.setMatrixAt(index, HIDDEN_POSE);
        return;
      }
      // Combustion is not steady — a per-particle scale jitter is what stops a
      // stack of overlapping additive sprites from summing into one static
      // silhouette. Zero on every emitter but the exhaust.
      const flicker = item.flicker > 0 ? 1 + 0.12 * Math.sin(clock * 46 + item.flicker) : 1;
      // The angular cap scales with the sprite's AUTHORED size, so a 0.4-unit
      // spark can never balloon to the same 77 px on screen as a 1.7-unit
      // spin-out puff. The shared flat cap is what let the drift sparks read as
      // "large detached cyan lozenges" (comeback-city-p0_33) once the camera
      // had closed to within a few units of them.
      const angleCap = depth * MAX_SPRITE_ANGLE * Math.min(1, item.size * 0.6);
      const width = Math.min(item.size * (0.5 + fade * 0.8) * prox * flicker, angleCap);
      if (width < depth * MIN_SPRITE_ANGLE) {
        burstMesh.setMatrixAt(index, HIDDEN_POSE);
        return;
      }
      const screenSpeed = scratchScreenVelocity.length();
      // Sparks MUST read as motion — a spark in a still frame is only legible
      // as a streak, so they keep the full cap. The exhaust caps far shorter
      // (see FLAME_*_STRETCH_MAX): past ~3x its own width a plume sprite stops
      // reading as gas and starts reading as a rod.
      if (item.stretch > 0 && screenSpeed > 0.02) {
        const roll = Math.atan2(scratchScreenVelocity.y, scratchScreenVelocity.x) - Math.PI / 2;
        scratchScale.set(width, width * (1 + Math.min(item.stretchMax, screenSpeed * 2.4 * item.stretch)), 1);
        scratchRoll.setFromAxisAngle(Z_AXIS, roll).premultiply(scratchQuaternion);
        burstMesh.setMatrixAt(index, scratchMatrix.compose(item.position, scratchRoll, scratchScale));
      } else {
        scratchScale.setScalar(width);
        burstMesh.setMatrixAt(index, scratchMatrix.compose(item.position, scratchQuaternion, scratchScale));
      }
      // Eased to zero, not floored at 0.25 — a sprite that dies at a quarter
      // brightness blinks out and reads as a dropped object.
      burstMesh.setColorAt(
        index,
        scratchColor.copy(item.tint).multiplyScalar(item.brightness * fade * (0.3 + fade * 0.7) * prox)
      );
      burstColorDirty = true;
    });
    burstMesh.instanceMatrix.needsUpdate = true;
    if (burstColorDirty) burstMesh.instanceColor.needsUpdate = true;

    // Speed-lines. Decorative — reducedMotion kills them outright.
    const intensity = Math.min(1.5, boostEnergy * 0.85 + boostPunch * 0.75);
    const visible = intensity > 0.01 && !context.reducedMotion;
    // 0.34, not 0.82: with the field now three to five times denser, the old
    // per-streak weight put every line at additive 1.0+ and blew the sunset
    // palette out to white bars. The field has to grade the frame, not paint it.
    speedLineUniforms.uIntensity.value = visible ? intensity * 0.34 : 0;
    // Keep the quad in the draw list for the first few frames so the shader
    // compiles during the countdown instead of hitching on the first boost.
    if (speedLineWarmup > 0) speedLineWarmup -= 1;
    speedLines.visible = visible || speedLineWarmup > 0;
    // Wrapped so the phase never loses float precision over a long race.
    speedLineUniforms.uTime.value = (speedLineUniforms.uTime.value + dt) % 1000;
    speedLineUniforms.uAspect.value = camera.isPerspectiveCamera && camera.aspect ? camera.aspect : 16 / 9;
    // The field retreats to the corners and slows as the boost bleeds out.
    speedLineUniforms.uInner.value = 0.46 - 0.1 * Math.min(1, intensity);
    // Higher density = SHORTER streaks (density is cycles per unit radius), so
    // the field tightens up as it peaks instead of growing 600 px rods.
    speedLineUniforms.uDensity.value = 2.7 + Math.min(1, intensity) * 1.1;
    speedLineUniforms.uLanes.value = LANES_BY_TIER[tier];
    speedLineTint.set(tier >= 1 ? DRIFT_FEEL.sparkColors[tier] : PAD_BOOST_TINT);
    speedLineUniforms.uTint.value.lerp(speedLineTint, Math.min(1, dt * 10));

    // Anchors track every frame, not just while the field is up: a 0.07 s
    // attack cannot wait for a smoothed chase to catch up.
    const smoothing = 1 - Math.exp(-dt * 6);
    // The streaks converge on the look-ahead point, so they read as the world
    // rushing past the line the kart is committed to. It doubles as the sky
    // anchor in the shader — everything above it is background.
    const focus = speedLineUniforms.uFocus.value;
    const lookAheadHit = projectToUv(
      context.kartPosition.x + Math.sin(context.yaw) * 42,
      context.groundY + 3,
      context.kartPosition.z + Math.cos(context.yaw) * 42,
      camera
    );
    followUv(focus, lookAheadHit, 0.5, 0.55, smoothing);
    focus.x = THREE.MathUtils.clamp(focus.x, 0.2, 0.8);
    focus.y = THREE.MathUtils.clamp(focus.y, 0.3, 0.85);

    // The exclusion disc tracks the kart's own screen position — it slides
    // well off centre in a drift, so a fixed centre hole would not cover it.
    const guardHit = projectToUv(
      context.kartPosition.x,
      context.kartPosition.y + 1.5,
      context.kartPosition.z,
      camera
    );
    followUv(speedLineUniforms.uGuard.value, guardHit, 0.5, 0.42, smoothing);
    // ...and its SIZE tracks the kart's screen size. focalLength is the
    // projection matrix's [1][1] = 1 / tan(fovY/2), so a world half-extent H at
    // depth d subtends 0.5 * focalLength * H / d in uv-y, and the same angle
    // divided by the aspect in uv-x (uv-x spans the wider frame). Clamped at
    // both ends: too small and the field crosses the bodywork, too large and it
    // eats the whole frame and there is no boost cue left.
    if (guardHit && lastProjectDepth > 1) {
      const guardRadius = speedLineUniforms.uGuardRadius.value;
      const half = (0.5 * focalLength) / lastProjectDepth;
      const targetX = THREE.MathUtils.clamp((half * GUARD_HALF_WIDTH) / speedLineUniforms.uAspect.value, 0.1, 0.52);
      const targetY = THREE.MathUtils.clamp(half * GUARD_HALF_HEIGHT, 0.12, 0.6);
      guardRadius.x += (targetX - guardRadius.x) * smoothing;
      guardRadius.y += (targetY - guardRadius.y) * smoothing;
    }
  };

  const dispose = () => {
    sprayMesh.dispose();
    burstMesh.dispose();
    skidGeometry.dispose();
    skidMesh.material.dispose();
    speedLines.geometry.dispose();
    speedLines.material.dispose();
  };

  return { dispose, group, onCue, speedLines, update };
};
