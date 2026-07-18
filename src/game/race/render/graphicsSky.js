// Graphics overhaul — Phase 4 cinematic sky (background/skybox).
// Procedural sky-dome texture: a vertical gradient tuned per track, plus a
// soft sun disc with halo near the horizon and a faint star field fading in
// toward the zenith. Generated on a canvas (zero asset bytes, deterministic
// seed) and applied as scene.background as an equirect texture, so it wraps
// the full 360° behind the existing billboard backdrop rings.
//
// The backdrop rings (city/ice silhouettes) stay — they own the near/far
// horizon art. This module owns the SKY ABOVE them: richer gradient, a sun
// that matches the track's key light, and upper-sky depth. Rendering-only.
import * as THREE from 'three';

// Per-track sky grades. Colors pair with graphicsAtmosphere.js so the sun
// disc sits on the same side / hue family as the key light.
export const TRACK_SKY_GRADES = {
  'comeback-city': {
    // Golden-hour neon dusk: deep indigo zenith -> magenta -> hot amber horizon.
    stops: [
      [0, '#05071a'],
      [0.42, '#1a1650'],
      [0.66, '#4a2366'],
      [0.8, '#c04a6e'],
      [0.92, '#ff8a52'],
      [1, '#ffc06a'],
    ],
    sun: { color: '#fff0c0', haloColor: '#ff9a4a', elevation: 0.86, azimuth: 0.5, size: 0.055, intensity: 1.0 },
    stars: { count: 140, brightness: 0.7, belowElevation: 0.5 },
  },
  'penguin-village': {
    // Crisp arctic dawn: teal-navy zenith -> pale cyan -> soft gold horizon.
    stops: [
      [0, '#04101e'],
      [0.4, '#0f2c46'],
      [0.62, '#1f506a'],
      [0.78, '#3f8a9a'],
      [0.9, '#9fd4dc'],
      [1, '#e8f0d8'],
    ],
    sun: { color: '#fff4d8', haloColor: '#a8e0e8', elevation: 0.82, azimuth: 0.5, size: 0.045, intensity: 0.9 },
    stars: { count: 90, brightness: 0.5, belowElevation: 0.45 },
  },
};

export const DEFAULT_SKY_GRADE = {
  stops: [
    [0, '#0a0f28'],
    [0.5, '#1c2150'],
    [0.74, '#462a66'],
    [0.86, '#a04a74'],
    [1, '#e08a5a'],
  ],
  sun: { color: '#ffe9b8', haloColor: '#ff8a5a', elevation: 0.86, azimuth: 0.5, size: 0.05, intensity: 0.9 },
  stars: { count: 110, brightness: 0.6, belowElevation: 0.5 },
};

export const skyGradeFor = (trackKey) => TRACK_SKY_GRADES[trackKey] || DEFAULT_SKY_GRADE;

// Build the equirect sky texture. width×height is the canvas res; the sky is
// low-frequency (gradient + soft sun), so 1024×512 is plenty and cheap.
export const makeGraphicsSkyTexture = ({ trackKey, width = 1024, height = 512 } = {}) => {
  const grade = skyGradeFor(trackKey);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 1) Vertical gradient (zenith at v=0 top, horizon at v=1 bottom). Equirect
  //    v maps pole->pole; we treat the lower ~half as below-horizon (hidden by
  //    the ground/backdrop), so the interesting band is v 0..0.55.
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  grade.stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 2) Horizon glow band — a warm lift just above the horizon line so the
  //    backdrop silhouettes sit against a luminous sky, not a hard edge.
  const horizonY = height * 0.5;
  const glow = ctx.createLinearGradient(0, horizonY - height * 0.12, 0, horizonY + height * 0.04);
  glow.addColorStop(0, 'rgba(255,255,255,0)');
  glow.addColorStop(0.7, hexToRgba(grade.sun.haloColor, 0.22));
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, horizonY - height * 0.12, width, height * 0.16);

  // 3) Sun disc + halo. Azimuth 0.5 centers it on the -Z horizon (the chase
  //    camera looks down-track toward the skyline at spawn). elevation is a
  //    v-fraction in the sky band (0=zenith, 1=horizon).
  const sunX = width * grade.sun.azimuth;
  const sunY = height * grade.sun.elevation * 0.5; // keep within the upper hemisphere
  const sunR = height * grade.sun.size;
  // Halo (large soft radial).
  const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 6);
  halo.addColorStop(0, hexToRgba(grade.sun.haloColor, 0.5 * grade.sun.intensity));
  halo.addColorStop(0.4, hexToRgba(grade.sun.haloColor, 0.18 * grade.sun.intensity));
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(sunX - sunR * 6, sunY - sunR * 6, sunR * 12, sunR * 12);
  // Disc (bright core).
  const disc = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  disc.addColorStop(0, hexToRgba(grade.sun.color, 0.95 * grade.sun.intensity));
  disc.addColorStop(0.7, hexToRgba(grade.sun.color, 0.7 * grade.sun.intensity));
  disc.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // 4) Stars — deterministic scatter in the upper sky, fading toward the
  //    horizon so they don't fight the backdrop. Seeded, no Math.random.
  let seed = 987654321;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const { count, brightness, belowElevation } = grade.stars;
  for (let i = 0; i < count; i += 1) {
    const x = next() * width;
    // Bias stars toward the zenith (low v).
    const v = Math.pow(next(), 1.6) * belowElevation * 0.5;
    const y = v * height;
    const fade = 1 - v / (belowElevation * 0.5); // dimmer near the horizon band
    const r = 0.5 + next() * 1.3;
    ctx.fillStyle = `rgba(255,255,255,${(0.3 + next() * 0.7) * brightness * fade})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Equirectangular mapping so scene.background wraps it around the world.
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
};

// small hex->rgba helper (canvas gradients need rgba() strings for alpha).
const hexToRgba = (hex, alpha) => {
  const c = new THREE.Color(hex);
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`;
};
