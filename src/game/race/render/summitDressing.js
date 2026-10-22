// Satoshi Summit track dressing — what makes the third track a blue-hour
// mountain pass rather than a road on a snowfield:
//
//   - the SATOSHI SUMMIT start gantry
//   - the HODL HAUS ski lodge on the straight, warm amber windows
//   - the summit station: a steel beacon tower, a giant spinning B coin and a
//     light column, mining-rig containers, an ordinal statue
//   - the crevasse under the bridge: a glowing fissure with ice-spire lips
//   - the avalanche gallery over the final corner: an open-sided snow shed
//   - snow-capped pines, rock outcrops and a ring of big peaks
//   - ordinal-penguin spectators (placements only: no generic stand-in is ever
//     built, so the only penguins that appear are the roster ordinals that
//     swapOrdinalPenguins mounts once their GLBs load)
//
// House rules it follows: FEWER, BIGGER, chunky shapes; every repeated prop is
// instanced; transparent materials are only additive glow that writes no
// depth (solid things are opaque); no Math.random (same look every boot); all
// textures are drawn at runtime (zero image bytes). The code is written tight
// on purpose — the JS gzip budget is shared.
//
// The monolith hands over a few of its own helpers (the toon material on the
// track's ramp, glow sprite, instancing, camera-guard exemption) so this file
// never imports the 14k-line runtime.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createBasicMaterial } from './createKartModel.js';
import { GROUND_BASE_Y } from './groundTerrain.js';
import { AMBIENT_SWAY_TIME } from './toonRimShader.js';

const TAU = Math.PI * 2;
const wrap01 = (value) => ((value % 1) + 1) % 1;
const hash01 = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
};
// The kerb/run-off/barrier profile reaches ~13.6 units past the drivable edge
// (roadEdgeSection with the shipped 3.4 curb); props keep outside it.
const BARRIER_REACH = 14;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
// Unlit, pushed over 1.0 so it reaches the bloom threshold like a light.
const glowing = (hex, k = 1.5, extra) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), ...extra });
// Additive glow that writes no depth; colour rides the vertices (black = none).
const additive = (extra) =>
  new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    transparent: true,
    vertexColors: true,
    ...extra,
  });
const put = (parent, geometry, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// A grid of `columns` vertices per row, rows in order, as one indexed mesh.
const gridMesh = (positions, columns, material, colors) => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (colors) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const rows = positions.length / 3 / columns;
  const index = [];
  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const a = (row - 1) * columns + column - 1;
      const b = a + columns;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
};
// One InstancedMesh from a list of { x, y, z, s?, q? } spots.
const field = (geometry, material, spots) => {
  const mesh = new THREE.InstancedMesh(geometry, material, spots.length);
  const matrix = new THREE.Matrix4();
  spots.forEach((spot, index) => {
    const s = spot.s ?? 1;
    mesh.setMatrixAt(index, matrix.compose(V(spot.x, spot.y, spot.z), spot.q || new THREE.Quaternion(), V(s, spot.sy ?? s, s)));
  });
  mesh.computeBoundingSphere();
  return mesh;
};

// ---------------------------------------------------------------------------
// Road proximity: one dense centreline table, bucketed.
// ---------------------------------------------------------------------------
const createRoadIndex = (sampler) => {
  const count = Math.min(2400, Math.max(400, Math.round(sampler.length / 8)));
  const xs = new Float32Array(count);
  const zs = new Float32Array(count);
  const reach = new Float32Array(count);
  const cells = new Map();
  const CELL = 160;
  const key = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  for (let index = 0; index < count; index += 1) {
    const { center } = sampler.pointAt(index / count);
    xs[index] = center.x;
    zs[index] = center.z;
    reach[index] = sampler.widthAt(index / count) * 0.44 + BARRIER_REACH;
    const k = key(center.x, center.z);
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(index);
  }
  // Nearest sample within ~CELL (index -1: further than that).
  const nearest = (x, z, skip) => {
    let best = Infinity;
    let bestIndex = -1;
    for (let ox = -CELL; ox <= CELL; ox += CELL) {
      for (let oz = -CELL; oz <= CELL; oz += CELL) {
        for (const index of cells.get(key(x + ox, z + oz)) || []) {
          if (skip && skip(index / count)) continue;
          const d = (x - xs[index]) ** 2 + (z - zs[index]) ** 2;
          if (d < best) {
            best = d;
            bestIndex = index;
          }
        }
      }
    }
    return { distance: Math.sqrt(best), index: bestIndex };
  };
  return {
    count,
    // Distance beyond the barrier's outer face (negative = on the road).
    clearance: (x, z, skip) => {
      const hit = nearest(x, z, skip);
      return hit.index < 0 ? Infinity : hit.distance - reach[hit.index];
    },
    farDistance: (x, z) => {
      let best = Infinity;
      for (let index = 0; index < count; index += 2) best = Math.min(best, (x - xs[index]) ** 2 + (z - zs[index]) ** 2);
      return Math.sqrt(best);
    },
    nearest,
    xs,
    zs,
  };
};

// Winding test against a closed polyline given as { count, xs, zs }.
const insideLoop = ({ count, xs, zs }, x, z) => {
  let inside = false;
  for (let i = 0, j = count - 1; i < count; j = i, i += 1) {
    if (zs[i] > z !== zs[j] > z && x < ((xs[j] - xs[i]) * (z - zs[i])) / (zs[j] - zs[i]) + xs[i]) inside = !inside;
  }
  return inside;
};

// ---------------------------------------------------------------------------
// Runtime textures (basic latin text only, so no glyph ever falls back to a
// tofu box on a device without the bundled font).
// ---------------------------------------------------------------------------
const paint = (width, height, draw) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const neonPanel = (text, accent = '#ff4fd8', height = 192) =>
  paint(1024, height, (ctx) => {
    ctx.fillStyle = '#100e2e';
    ctx.fillRect(0, 0, 1024, height);
    ctx.strokeStyle = ctx.shadowColor = '#36e2ff';
    ctx.lineWidth = 6;
    ctx.shadowBlur = 18;
    ctx.strokeRect(14, 14, 996, height - 28);
    ctx.font = `900 italic ${height >> 1}px "Trebuchet MS", "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = ctx.fillStyle = accent;
    ctx.shadowBlur = 34;
    ctx.fillText(text, 512, height / 2 + 4);
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffe3f8';
    ctx.fillText(text, 512, height / 2 + 4);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let x = 0; x < 1024; x += 4) ctx.fillRect(x, 0, 1, height);
    for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, 1024, 1);
  });

// The coin face: the bitcoin mark from primitives (a tilted B with its two
// strokes), so it never depends on a font having U+20BF.
const coinFace = () =>
  paint(512, 512, (ctx) => {
    const disc = ctx.createRadialGradient(205, 180, 20, 256, 256, 256);
    disc.addColorStop(0, '#ffe7a3');
    disc.addColorStop(0.55, '#ffb42e');
    disc.addColorStop(1, '#d9761a');
    ctx.fillStyle = disc;
    ctx.arc(256, 256, 252, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 22;
    ctx.strokeStyle = ctx.fillStyle = '#fff1c9';
    ctx.beginPath();
    ctx.arc(256, 256, 222, 0, TAU);
    ctx.stroke();
    ctx.translate(256, 256);
    ctx.rotate(0.24);
    ctx.fillStyle = '#fff';
    ctx.font = '900 300px "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('B', 8, 14);
    [-38, 26].forEach((x) => {
      ctx.fillRect(x, -168, 26, 48);
      ctx.fillRect(x, 116, 26, 48);
    });
  });

const lodgeWindows = () =>
  paint(512, 256, (ctx) => {
    ctx.fillStyle = '#2a1a22';
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 14; i += 1) {
      const x = 22 + (i % 7) * 70;
      const y = 40 + (i > 6 ? 110 : 0);
      const glass = ctx.createLinearGradient(0, y, 0, y + 70);
      const lit = hash01(i * 7) > 0.18;
      glass.addColorStop(0, lit ? '#ffd58a' : '#3b2c48');
      glass.addColorStop(1, lit ? '#ff9a3c' : '#241a33');
      ctx.fillStyle = glass;
      ctx.fillRect(x, y, 48, 70);
      ctx.fillStyle = '#2a1a22';
      ctx.fillRect(x + 22, y, 4, 70);
      ctx.fillRect(x, y + 33, 48, 4);
    }
  });

// Spin a mesh about its own Y axis on the shared ambient clock (zero CPU per
// frame; reducedMotion freezes the clock, so it freezes this too).
const spinOnAmbientClock = (material) => {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSpinTime = AMBIENT_SWAY_TIME;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uSpinTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
  float spinA = uSpinTime * 0.55;
  transformed.xz = mat2(cos(spinA), -sin(spinA), sin(spinA), cos(spinA)) * transformed.xz;`
      );
  };
  material.customProgramCacheKey = () => 'summit-spin';
  return material;
};

// A box beam from a to b, as a geometry.
const beamBetween = (a, b, thickness) => {
  const delta = V().subVectors(b, a);
  return box(thickness, delta.length(), thickness)
    .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), delta.normalize()))
    .translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
};

// Jittered, snow-capped rock or mountain. Jitter is keyed on the vertex
// POSITION, so a seam's duplicated vertices move together and the shell stays
// closed; `ridges` pulls alternate radial steps in — a star cross-section,
// i.e. ridges and gullies — for the big peaks.
const ROCK_COLORS = ['#3e4173', '#2b2d58', '#e3e9ff'].map((hex) => new THREE.Color(hex));
const craggy = (geometry, seed, snowLine, ridges = 0) => {
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const key = Math.round(x * 97) * 7 + Math.round(y * 97) * 131 + Math.round(z * 97) * 1913 + seed * 7919;
    const pull = (0.78 + hash01(key) * 0.42) * (ridges && Math.round((Math.atan2(z, x) / TAU) * 10) % 2 ? 1 - ridges : 1);
    const lifted = Math.max(-0.38, ridges ? y : y * pull);
    position.setXYZ(index, x * pull, lifted, z * pull);
    ROCK_COLORS[lifted > snowLine + (hash01(key + 3) - 0.5) * 0.18 ? 2 : hash01(key + 5) > 0.5 ? 0 : 1].toArray(colors, index * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
};

// ---------------------------------------------------------------------------
// The dressing
// ---------------------------------------------------------------------------
export const addSatoshiSummitDressing = (world, sampler, trackDef, ambient, helpers) => {
  const { addGlowSprite, createToonMaterial: toon, instanceTemplateField, markCameraExempt, setFlatTransform } = helpers;
  const road = createRoadIndex(sampler);
  const terrain = world.userData?.groundTerrain || null;
  const groundAt = (x, z) => GROUND_BASE_Y + (terrain ? terrain.solve(x, z).terrainLift : 0);
  const frameAt = (progress) => sampler.pointAt(wrap01(progress));
  const edgeAt = (progress) => sampler.widthAt(progress) * 0.44 + BARRIER_REACH;
  // A point `out` units from the centreline on side `side` (lane-sign).
  const beside = (progress, side, out) => {
    const { normal, point } = frameAt(progress);
    return { point, x: point.x + normal.x * side * out, z: point.z + normal.z * side * out };
  };
  // +1 when the road at `progress` bends toward its +normal (lane +1) side.
  const insideOf = (progress) => {
    const a = frameAt(progress - 0.004).tangent;
    const b = frameAt(progress + 0.004).tangent;
    const { normal } = frameAt(progress);
    return (b.x - a.x) * normal.x + (b.z - a.z) * normal.z >= 0 ? 1 : -1;
  };
  // Away from the loop's centroid: the outside of the lap at `progress`.
  const centroid = { x: 0, z: 0 };
  for (let index = 0; index < road.count; index += 1) {
    centroid.x += road.xs[index] / road.count;
    centroid.z += road.zs[index] / road.count;
  }
  const outsideOf = (progress) => {
    const { normal, point } = frameAt(progress);
    return (point.x - centroid.x) * normal.x + (point.z - centroid.z) * normal.z >= 0 ? 1 : -1;
  };
  const exclusions = [];
  const excluded = (x, z) => exclusions.some((zone) => (x - zone.x) ** 2 + (z - zone.z) ** 2 < zone.r * zone.r);
  const band = trackDef.elevation?.bridgeBand || null;
  const crestProgress = band ? (band.from + band.to) / 2 : null;

  // ---- The summit station's site: the pole of inaccessibility of the
  // carousel — the road from the top of the climb, round the U and back down,
  // closed with a chord — i.e. the middle of the summit plateau.
  const site = (() => {
    const ring = { count: 0, xs: [], zs: [] };
    for (let p = 0.615; p <= 0.735; p += 0.003) {
      const { center } = frameAt(p);
      ring.xs.push(center.x);
      ring.zs.push(center.z);
      ring.count += 1;
    }
    let best = { d: -1, x: ring.xs[0], z: ring.zs[0] };
    for (let x = Math.min(...ring.xs); x <= Math.max(...ring.xs); x += 16) {
      for (let z = Math.min(...ring.zs); z <= Math.max(...ring.zs); z += 16) {
        const d = insideLoop(ring, x, z) ? road.farDistance(x, z) : -1;
        if (d > best.d) best = { d, x, z };
      }
    }
    return best;
  })();
  exclusions.push({ r: Math.min(site.d - 40, 120), x: site.x, z: site.z });

  // ---- The crevasse runs across the bridge three quarters along its deck —
  // not at the crest: the launch is at the crest, so this is the stretch the
  // kart is FLYING over, in front of the chase camera, instead of ground
  // hidden behind the ramp's barriers.
  let crevasse = null;
  if (band) {
    const progress = band.from + (band.to - band.from) * 0.74;
    const { center, normal, tangent } = frameAt(progress);
    crevasse = { center, normal, progress, tangent };
  }
  const onCrevasse = (x, z) => {
    if (!crevasse) return false;
    const dx = x - crevasse.center.x;
    const dz = z - crevasse.center.z;
    return (
      Math.abs(dx * crevasse.normal.x + dz * crevasse.normal.z) < 470 &&
      Math.abs(dx * crevasse.tangent.x + dz * crevasse.tangent.z) < 56
    );
  };

  // ---- Lodge site (outside of the straight) and the gallery span (final
  // corner), reserved before any tree goes down.
  const lodgeProgress = 0.045;
  const lodge = beside(lodgeProgress, outsideOf(lodgeProgress), edgeAt(lodgeProgress) + 36);
  exclusions.push({ r: 70, x: lodge.x, z: lodge.z });
  const galleryFrom = 0.957;
  const galleryTo = 0.992;
  const galleryInside = insideOf((galleryFrom + galleryTo) / 2);

  // =========================================================================
  // 1. START GANTRY over the lap line (progress 0, where the default gate
  // would stand): two steel towers and the SATOSHI SUMMIT board.
  // =========================================================================
  {
    const { point, tangent } = frameAt(0);
    const half = edgeAt(0) + 3;
    const gantry = new THREE.Group();
    gantry.position.copy(point);
    gantry.rotation.y = Math.atan2(tangent.x, tangent.z);
    const steel = toon('#2c2f5e', { emissive: '#14123a', emissiveIntensity: 0.4 });
    [-1, 1].forEach((side) => {
      put(gantry, box(6, 41, 6), steel, side * half, 19.5);
      const accent = side > 0 ? '#ff4fd8' : '#36e2ff';
      put(gantry, box(7.5, 2.2, 7.5), glowing(accent, 1.6), side * half, 41);
      addGlowSprite(gantry, accent, 24, 0.4, 41).position.x = side * half;
    });
    put(gantry, box(half * 2 + 6, 3, 4), steel, 0, 37);
    put(gantry, box(half * 2 - 2, 14, 2.4), steel, 0, 29);
    // Board faces, either side of the backing: SATOSHI SUMMIT faces the karts
    // arriving (local -z), STACK SATS the way out.
    ['SATOSHI SUMMIT', 'STACK SATS'].forEach((text, index) => {
      const face = index ? 1 : -1;
      put(
        gantry,
        new THREE.PlaneGeometry(half * 2 - 4, 12),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.5, 1.5), map: neonPanel(text) }),
        0,
        29,
        face * 1.4
      ).rotation.y = face < 0 ? Math.PI : 0;
    });
    world.add(gantry);
  }

  // =========================================================================
  // 2. HODL HAUS — the ski lodge on the outside of the straight. Local +z
  // faces the road; the gable faces the road too.
  // =========================================================================
  {
    const house = new THREE.Group();
    house.position.set(lodge.x, groundAt(lodge.x, lodge.z), lodge.z);
    house.rotation.y = Math.atan2(lodge.point.x - lodge.x, lodge.point.z - lodge.z);
    const stone = toon('#3a3b62');
    const timber = toon('#4d3140');
    const windows = lodgeWindows();
    const glass = new THREE.MeshStandardMaterial({ emissive: '#fff', emissiveIntensity: 1.25, emissiveMap: windows, map: windows, roughness: 0.85 });
    put(house, box(96, 8, 50), stone, 0, 2);
    // Box face 4 (+z) carries the windows.
    put(house, box(88, 22, 44), [timber, timber, timber, timber, glass, timber], 0, 17);
    const gable = (half, depth) =>
      new THREE.ExtrudeGeometry(new THREE.Shape([V(-half, 0), V(half, 0), V(0, 30)]), { bevelEnabled: false, depth });
    put(house, gable(58, 56).translate(0, 0, -28), toon('#e7ecff'), 0, 28);
    put(house, gable(60, 2), timber, 0, 27, 27.5);
    put(house, new THREE.CircleGeometry(8, 24), glowing('#ffb04a'), 0, 40, 29.6);
    put(house, box(8, 22, 8), stone, 26, 44, -6);
    put(
      house,
      new THREE.PlaneGeometry(40, 7.5),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.5, 1.5), map: neonPanel('HODL HAUS', '#ffb04a') }),
      0,
      30.5,
      29.7
    );
    addGlowSprite(house, '#ffb04a', 70, 0.32, 20).position.z = 30;
    world.add(setFlatTransform(house));
  }

  // =========================================================================
  // 3. SUMMIT STATION — beacon tower, the B coin, light column, mining rigs,
  // an ordinal statue. Local +z faces the nearest road.
  // =========================================================================
  {
    const station = new THREE.Group();
    station.userData.kind = 'summit-station';
    station.position.set(site.x, groundAt(site.x, site.z), site.z);
    const nearest = road.nearest(site.x, site.z);
    if (nearest.index >= 0) station.rotation.y = Math.atan2(road.xs[nearest.index] - site.x, road.zs[nearest.index] - site.z);
    const pad = Math.min(82, Math.max(50, site.d - 70));
    put(station, new THREE.CylinderGeometry(pad, pad + 6, 10, 10), toon('#33365f'), 0, -3);
    put(station, new THREE.TorusGeometry(pad + 0.6, 0.9, 6, 40), glowing('#36e2ff', 1.4), 0, 2.1).rotation.x = Math.PI / 2;
    // Tower: four raked legs and X-braced bays, merged; LED strips up the legs.
    const TOWER = 118;
    const halfAt = (y) => 15 - 10 * (y / TOWER);
    const corners = [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1],
    ];
    const frame = [];
    const leds = [];
    corners.forEach(([sx, sz], index) => {
      frame.push(beamBetween(V(sx * 15, 2, sz * 15), V(sx * 5, TOWER, sz * 5), 2.6));
      leds.push(beamBetween(V(sx * 16.5, 4, sz * 16.5), V(sx * 6.5, TOWER - 2, sz * 6.5), 0.7));
      const [tx, tz] = corners[(index + 1) % 4];
      for (let y = 14; y < TOWER; y += 20) {
        const y1 = Math.min(TOWER, y + 20);
        const h0 = halfAt(y);
        frame.push(beamBetween(V(sx * h0, y, sz * h0), V(tx * h0, y, tz * h0), 1.2));
        frame.push(beamBetween(V(sx * h0, y, sz * h0), V(tx * halfAt(y1), y1, tz * halfAt(y1)), 0.9));
      }
    });
    frame.push(box(18, 2.4, 18).translate(0, TOWER, 0));
    put(station, mergeGeometries(frame), toon('#3b4178', { emissive: '#120f36', emissiveIntensity: 0.5 }));
    put(station, mergeGeometries(leds), glowing('#ff4fd8', 1.6));
    // The coin, 44 across, spinning on the ambient clock; fog-exempt so it
    // reads as a beacon from anywhere on the lap. The geometry (not the mesh)
    // is turned on edge so the shader spin stays about world Y.
    const COIN_Y = TOWER + 26;
    const face = spinOnAmbientClock(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 1.2, 1.15), fog: false, map: coinFace() }));
    const rim = spinOnAmbientClock(glowing('#ffb42e', 1.35, { fog: false }));
    put(station, new THREE.CylinderGeometry(22, 22, 4, 48).rotateX(Math.PI / 2), [rim, face, face], 0, COIN_Y);
    addGlowSprite(station, '#ffb42e', 120, 0.34, COIN_Y);
    // Light column above the coin: gold at its foot fading to nothing.
    const column = new THREE.CylinderGeometry(9, 4, 460, 16, 1, true);
    const colors = new Float32Array(column.attributes.position.count * 3);
    for (let index = 0; index < colors.length / 3; index += 1) {
      if (column.attributes.position.getY(index) < 0) colors.set([0.5, 0.31, 0.09], index * 3);
    }
    column.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    put(station, column, additive({ fog: false }), 0, COIN_Y + 254);
    // Mining rigs: six containers round the tower foot, two LED colours.
    const rigRadius = Math.min(pad - 16, 46);
    ['#36e2ff', '#ff4fd8'].forEach((led, colorIndex) => {
      const rig = new THREE.Group();
      put(rig, box(28, 12, 12), toon('#24274f'), 0, 6);
      put(rig, box(28.4, 1.1, 12.4), glowing(led), 0, 8.6);
      put(rig, mergeGeometries([-8, 0, 8].map((x) => new THREE.CylinderGeometry(3.2, 3.2, 1.6, 10).translate(x, 12.8, 0))), toon('#151735'));
      const spots = [];
      for (let k = colorIndex; k < 6; k += 2) {
        const angle = (k / 6) * TAU + 0.3;
        spots.push({ position: V(Math.cos(angle) * rigRadius, 1.5, Math.sin(angle) * rigRadius), rotationY: -angle });
      }
      instanceTemplateField(rig, spots).forEach((mesh) => station.add(mesh));
    });
    // Ordinal statue on the road-facing edge: the figure is mounted by
    // swapOrdinalPenguins, which seats it at 0.4 of the statue's height — the
    // top of this plinth.
    if (ambient) {
      const statue = new THREE.Group();
      put(statue, new THREE.CylinderGeometry(8.8, 10.9, 13.6, 8), toon('#3b3d66', { emissive: '#1a1840', emissiveIntensity: 0.4 }), 0, 6.8);
      put(statue, new THREE.TorusGeometry(9.2, 0.6, 6, 24), glowing('#ffb42e', 1.3), 0, 13.6).rotation.x = Math.PI / 2;
      statue.userData.statueHeight = 34;
      statue.position.set(0, 2, pad - 14);
      station.add(statue);
      ambient.ordinalStatues.push(statue);
    }
    world.add(station);
  }

  // =========================================================================
  // 4. CREVASSE — the glowing fissure under the bridge.
  // =========================================================================
  if (crevasse) {
    const { center, normal, tangent } = crevasse;
    // Anything rising out of the crevasse stays under the deck's skirts (6.9
    // deep) where the road passes over it.
    const deckClear = sampler.elevationAt(crevasse.progress) - 8;
    // Shorten either arm where it would reach another stretch of road.
    const nearBridge = (progress) => Math.abs(progress - crestProgress) < 0.05;
    const arm = (direction) => {
      for (let s = 60; s <= 460; s += 10) {
        if (road.clearance(center.x + normal.x * s * direction, center.z + normal.z * s * direction, nearBridge) < 30) return s - 20;
      }
      return 460;
    };
    const reachA = arm(-1);
    const reachB = arm(1);
    // Five vertices across: lip, wall, floor, wall, lip — dark, deep, with
    // pale ice lips. The floor's light is the vertical sheet below.
    const shade = ['#d4f1ff', '#152457', '#070a24', '#152457', '#d4f1ff'].map((hex) => new THREE.Color(hex));
    const fissure = [];
    const fissureColors = [];
    const sheet = [];
    const sheetColors = [];
    const lips = [];
    for (let s = -reachA; s <= reachB; s += 10) {
      const t = Math.abs(s) / (s < 0 ? reachA : reachB);
      const halfWidth = 6 + 28 * (1 - Math.max(0, (t - 0.62) / 0.38) ** 2);
      const jag = Math.sin(s * 0.031) * 9 + Math.sin(s * 0.083 + 1.3) * 4;
      const x = center.x + normal.x * s + tangent.x * jag;
      const z = center.z + normal.z * s + tangent.z * jag;
      const y = groundAt(x, z) + 0.42;
      [1, 0.55, 0, -0.55, -1].forEach((k, column) => {
        fissure.push(x + tangent.x * halfWidth * k, y, z + tangent.z * halfWidth * k);
        shade[column].toArray(fissureColors, fissureColors.length);
      });
      // Light welling up from the floor: a vertical sheet along the
      // centreline, cyan at the floor fading to nothing — the read from the
      // chase camera, which cannot see the floor past the deck's barriers.
      sheet.push(x, y, z, x, y + (Math.abs(s) < 56 ? Math.max(0, Math.min(24, deckClear)) : 24 * (1 - t * 0.5)), z);
      sheetColors.push(0.27, 0.9, 1, 0, 0, 0);
      // Ice spires on both lips; the biggest stand either side of the bridge,
      // above the deck's barriers, framing the jump.
      if (Math.round(s / 10) % 2 === 0) {
        [1, -1].forEach((side) => {
          const index = lips.length;
          const size = (Math.abs(s) < 120 ? 10 : 4.5) + hash01(index * 3.7) * 7.5;
          lips.push({
            q: new THREE.Quaternion().setFromEuler(
              new THREE.Euler((hash01(index) - 0.5) * 0.7, hash01(index * 1.3) * TAU, (hash01(index * 2.1) - 0.5) * 0.7)
            ),
            s: size,
            sy: size * (1.36 + hash01(index * 5.1)),
            x: x + tangent.x * side * (halfWidth + 3),
            y: y + size * 0.6,
            z: z + tangent.z * side * (halfWidth + 3),
          });
        });
      }
    }
    const floor = gridMesh(
      fissure,
      5,
      new THREE.MeshBasicMaterial({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide, vertexColors: true }),
      fissureColors
    );
    floor.userData.kind = 'summit-crevasse';
    world.add(setFlatTransform(floor));
    const light = gridMesh(sheet, 2, additive({ color: new THREE.Color(1.5, 1.5, 1.5) }), sheetColors);
    light.renderOrder = 2;
    world.add(setFlatTransform(light));
    world.add(setFlatTransform(field(new THREE.OctahedronGeometry(1, 0), createBasicMaterial('#9fe9ff', { emissive: '#2fb8ff', emissiveIntensity: 0.55 }), lips)));
  }

  // =========================================================================
  // 5. AVALANCHE GALLERY — open-sided snow shed over the final corner: a
  // rock-faced wall on the inside of the bend, pillars on the open valley
  // side, a snow-loaded roof 19.5 over the deck (above the chase camera's
  // 10-12.5 eye), work-lamps, an LED line down the roof, signed portals.
  // =========================================================================
  {
    const ROOF_UNDER = 19.5;
    const ROOF_TOP = 23;
    const steps = Math.max(12, Math.round(((galleryTo - galleryFrom) * sampler.length) / 6));
    const under = [];
    const top = [];
    const eave = [];
    const wall = [];
    const led = [];
    const pillars = [];
    const lamps = [];
    let arc = 0;
    let last = null;
    for (let step = 0; step <= steps; step += 1) {
      const progress = galleryFrom + ((galleryTo - galleryFrom) * step) / steps;
      const { center, normal } = frameAt(progress);
      const at = (out, y) => [center.x + normal.x * galleryInside * out, center.y + y, center.z + normal.z * galleryInside * out];
      const edge = edgeAt(progress);
      under.push(...at(edge + 10, ROOF_UNDER), ...at(-edge - 10, ROOF_UNDER));
      // Snow on top bulges toward the mountain side.
      top.push(...at(edge + 10, ROOF_TOP + 2.5), ...at(-edge - 10, ROOF_TOP));
      eave.push(...at(-edge - 10, ROOF_TOP), ...at(-edge - 10, ROOF_UNDER));
      wall.push(...at(edge + 3, -2), ...at(edge + 3, ROOF_UNDER + 0.5));
      led.push(...at(0.18, ROOF_UNDER - 0.08), ...at(-0.18, ROOF_UNDER - 0.08));
      if (last) arc += Math.hypot(center.x - last.x, center.z - last.z);
      last = center;
      if (step === 0 || step === steps || Math.floor(arc / 24) !== Math.floor((arc - 6) / 24)) {
        const [x, y, z] = at(-edge - 4, 0);
        pillars.push({ x, y, z });
      }
      if (step % 5 === 2) {
        const [x, y, z] = at(edge + 2.1, 12);
        lamps.push({ x, y, z });
      }
    }
    const gallery = new THREE.Group();
    gallery.userData.kind = 'summit-avalanche-gallery';
    const twoSided = (hex) => toon(hex, { side: THREE.DoubleSide });
    gallery.add(
      gridMesh(under, 2, twoSided('#25284f')),
      gridMesh(top, 2, twoSided('#e8eeff')),
      gridMesh(eave, 2, twoSided('#3b3f70')),
      gridMesh(wall, 2, twoSided('#454877')),
      gridMesh(led, 2, glowing('#36e2ff', 1.15, { side: THREE.DoubleSide })),
      field(box(3.8, ROOF_UNDER + 2.5, 3.8).translate(0, ROOF_UNDER / 2 - 0.75, 0), toon('#565a8c'), pillars),
      field(box(4.4, 1.2, 4.4).translate(0, ROOF_UNDER - 1.6, 0), glowing('#ff4fd8'), pillars),
      field(box(2.6, 1.6, 2.6), glowing('#ffb04a', 1.7), lamps)
    );
    // Portal fascias, across the opening (local x across the road), 19 -> 26
    // so they close the gap between the roof's underside and its snow.
    const sign = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.3, 1.3), map: neonPanel('AVALANCHE GALLERY', '#ffb04a', 96) });
    [galleryFrom, galleryTo].forEach((progress) => {
      const { center, normal, tangent } = frameAt(progress);
      put(
        gallery,
        box(edgeAt(progress) * 2 + 20, 7, 2.4),
        sign,
        center.x + normal.x * galleryInside * 1.5,
        center.y + ROOF_UNDER + 3,
        center.z + normal.z * galleryInside * 1.5
      ).rotation.y = Math.atan2(tangent.x, tangent.z);
    });
    // The guard must never dodge the roof the camera drives under.
    markCameraExempt(gallery);
    world.add(gallery);
  }

  // =========================================================================
  // 6. PEAKS — fewer, bigger: one massif in the infield, a ring outside.
  // =========================================================================
  {
    const sites = [];
    const xs = Array.from(road.xs);
    const zs = Array.from(road.zs);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    // Infield: the point inside the loop furthest from any road.
    let infield = { d: 0 };
    // Coarse grid, cheapest test first: only a point that beats the best so
    // far pays for the winding test.
    for (let x = minX; x <= maxX; x += 50) {
      for (let z = minZ; z <= maxZ; z += 50) {
        if ((x - site.x) ** 2 + (z - site.z) ** 2 < 160000) continue;
        const d = road.farDistance(x, z);
        if (d > infield.d && insideLoop(road, x, z)) infield = { d, x, z };
      }
    }
    if (infield.d > 260) {
      const radius = Math.min(420, infield.d - 120);
      sites.push({ h: radius * 1.25, r: radius, seed: 1.7, x: infield.x, z: infield.z });
    }
    // Outer ring about the loop's centre, each pushed out until clear.
    const extent = Math.max(maxX - minX, maxZ - minZ) / 2;
    for (let k = 0; k < 9; k += 1) {
      const angle = (k / 9) * TAU + 0.4;
      const r = 240 + hash01(k * 3.3) * 200;
      let distance = extent * 0.7 + 140;
      let x;
      let z;
      do {
        distance += 60;
        x = (minX + maxX) / 2 + Math.cos(angle) * distance;
        z = (minZ + maxZ) / 2 + Math.sin(angle) * distance;
      } while (road.farDistance(x, z) < r + 220 && distance < extent * 3);
      sites.push({ h: r * (1.2 + hash01(k * 7.7) * 0.6), r, seed: k + 3.1, x, z });
    }
    const peaks = new THREE.Mesh(
      mergeGeometries(
        sites.map((peak) =>
          // Unit cone, base at 0 and apex at 1, made craggy before it is sized.
          craggy(new THREE.ConeGeometry(1, 1, 10, 5).translate(0, 0.5, 0), peak.seed, 0.5, 0.34)
            .scale(peak.r, peak.h, peak.r)
            .translate(peak.x, groundAt(peak.x, peak.z) - 6, peak.z)
        )
      ),
      createBasicMaterial('#fff', { roughness: 0.95, vertexColors: true })
    );
    peaks.userData.kind = 'summit-peaks';
    world.add(setFlatTransform(peaks));
    sites.forEach((peak) => exclusions.push({ r: peak.r * 0.9, x: peak.x, z: peak.z }));
  }

  // =========================================================================
  // 7. PINES + ROCKS — clustered, big, instanced. Pines are a unit-height
  // template (instance scale = tree height): trunk, three needle tiers and
  // their snow caps (the top half of each tier, a touch larger, a half-step
  // turned so the facets break up).
  // =========================================================================
  {
    const pine = new THREE.Group();
    put(pine, new THREE.CylinderGeometry(0.03, 0.045, 0.2, 6), toon('#3a2a3e'), 0, 0.1);
    const tiers = [
      [0.44, 0.33, 0.12],
      [0.37, 0.25, 0.38],
      [0.31, 0.17, 0.62],
    ];
    put(pine, mergeGeometries(tiers.map(([h, r, y]) => new THREE.ConeGeometry(r, h, 7).translate(0, y + h / 2, 0))), toon('#1c4552'));
    put(
      pine,
      mergeGeometries(tiers.map(([h, r, y]) => new THREE.ConeGeometry(r * 0.55, h * 0.5 + 0.014, 7, 1, false, Math.PI / 7).translate(0, y + h * 0.75 + 0.007, 0))),
      toon('#e2e8ff')
    );
    const pines = [];
    const rocks = [[], [], []];
    const rock = (x, z, size, seed) => {
      if (road.clearance(x, z) > size * 1.3 + 4 && !excluded(x, z) && !onCrevasse(x, z)) {
        rocks[Math.floor(hash01(seed) * 3)].push({ position: V(x, groundAt(x, z) - size * 0.28, z), rotationY: hash01(seed * 31) * TAU, scale: size });
      }
    };
    const clusters = Math.round(sampler.length / 115);
    for (let cluster = 0; cluster < clusters; cluster += 1) {
      const progress = wrap01((cluster + 0.37) / clusters + (hash01(cluster * 3.1) - 0.5) * 0.004);
      if (progress > galleryFrom - 0.006 && progress < galleryTo + 0.006) continue;
      const side = hash01(cluster * 7.7) > 0.5 ? 1 : -1;
      const centre = beside(progress, side, sampler.widthAt(progress) * 0.5 + 44 + hash01(cluster * 11.3) * 160);
      const trees = 2 + Math.floor(hash01(cluster * 5.9) * 4);
      for (let tree = 0; tree < trees; tree += 1) {
        const angle = hash01(cluster * 13 + tree * 1.7) * TAU;
        const radius = 6 + hash01(cluster * 19 + tree * 2.9) * 34;
        const x = centre.x + Math.cos(angle) * radius;
        const z = centre.z + Math.sin(angle) * radius;
        const height = 16 + hash01(cluster * 17 + tree * 2.3) * 28;
        if (road.clearance(x, z) < height * 0.3 + 6 || excluded(x, z) || onCrevasse(x, z)) continue;
        pines.push({ position: V(x, groundAt(x, z) - 0.8, z), rotationY: hash01(cluster * 23 + tree) * TAU, scale: height });
      }
      if (cluster % 3 === 0) {
        const out = beside(progress, side, sampler.widthAt(progress) * 0.5 + 64 + hash01(cluster * 11.3) * 160);
        rock(out.x, out.z, 7 + hash01(cluster * 29) * 16, cluster);
      }
    }
    // The biggest crags: outside the summit carousel, and behind the
    // gallery's wall (the mountain shoulder the shed is cut into).
    [0.645, 0.66, 0.675, 0.69, 0.705].forEach((progress, index) => {
      const spot = beside(progress, -insideOf(progress), 70 + (index % 2) * 22);
      rock(spot.x, spot.z, 24 + (index % 3) * 9, progress * 1000);
    });
    for (let progress = galleryFrom; progress <= galleryTo; progress += 0.007) {
      const spot = beside(progress, galleryInside, edgeAt(progress) + 38);
      rock(spot.x, spot.z, 18 + hash01(progress * 313) * 10, progress * 977);
    }
    if (pines.length) instanceTemplateField(pine, pines).forEach((mesh) => world.add(mesh));
    const rockMaterial = createBasicMaterial('#fff', { roughness: 0.9, vertexColors: true });
    rocks.forEach((list, variant) => {
      if (!list.length) return;
      const template = new THREE.Group();
      put(template, craggy(new THREE.IcosahedronGeometry(1, 1).scale(1.3, 0.85, 1), variant + 1, 0.2), rockMaterial);
      instanceTemplateField(template, list).forEach((mesh) => world.add(mesh));
    });
  }

  // =========================================================================
  // 8. ORDINAL SPECTATORS — placements only (see the header).
  // =========================================================================
  if (ambient) {
    const placements = [];
    const crowd = (progresses, sideOf, lateral) => {
      progresses.forEach((progress, index) => {
        const spot = beside(progress, sideOf(progress), edgeAt(progress) + lateral + (index % 2) * 3);
        if (road.clearance(spot.x, spot.z) < 2) return;
        placements.push({
          // Inside the flat band the ground IS the road's height.
          position: V(spot.x, groundAt(spot.x, spot.z) - 0.15, spot.z),
          rotationY: Math.atan2(spot.point.x - spot.x, spot.point.z - spot.z),
        });
      });
    };
    crowd([0.011, 0.015, 0.019, 0.023, 0.027, 0.031], outsideOf, 3);
    crowd([0.652, 0.662, 0.672, 0.682, 0.692], insideOf, 4);
    crowd([0.869, 0.873, 0.877, 0.881], outsideOf, 4);
    crowd([0.212, 0.216], outsideOf, 4);
    ambient.spectators = { fields: [], placements };
  }
};
