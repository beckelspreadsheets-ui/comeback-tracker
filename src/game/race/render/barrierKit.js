// RELEASE_V1_PLAN 1.6 — the barrier as a race venue.
//
// Past the kerb the road edge was one long uninterrupted wall: nothing on it
// to read, and nothing passing at a regular beat to say how fast you are going.
// Two cheap additions, both built straight off the road's own edge rings
// (roadFrames), so they sit exactly on the barrier the edge profile welded:
//
//   LED boards  — 27-unit panels on the barrier's inner face, every ~230 units,
//                 alternating sides, carrying the group's slogans from ONE
//                 canvas atlas. One merged mesh, one draw call.
//   Rhythm posts — a slim post with a lit cap on the barrier crest every 42
//                 units on both sides: the delineator beat that makes speed
//                 legible in peripheral vision. One InstancedMesh.
//
// Owner pick 2026-10-15: on by default with these slogans; ?barrierKit=0 in
// the race URL turns it off.
import * as THREE from 'three';

// Group in-jokes only: no brands, no betting or odds (App Store age rating).
export const BARRIER_SLOGANS = Object.freeze([
  'HODL',
  'WAGMI',
  'GM',
  'STACK SATS',
  'NUMBER GO UP',
  'INSCRIBE EVERYTHING',
  '1 BTC = 1 BTC',
  'LFG',
]);

const KIT_COLORS = {
  'comeback-city': ['#ffd34f', '#36e2ff', '#ff4fd8', '#a7f542'],
  'penguin-village': ['#9fefff', '#f4fbff', '#b98cff', '#7fe8ff'],
};

const ATLAS_WIDTH = 1024;
// 16:1 cells match a 27 x ~1.6 unit board, so the lettering is not stretched.
const CELL_HEIGHT = 64;
const BOARD_PITCH = 230;
const BOARD_SPAN = 27;
const BOARD_BOTTOM = 1.0;
const BOARD_TOP = 2.55;
// Just proud of the face, toward the road, so the panel never z-fights it.
const BOARD_INSET = 0.07;
// Keep the start/finish straight clean for the gantry.
const START_CLEAR = 0.012;
const POST_PITCH = 42;
const POST_HEIGHT = 2.6;

const makeSloganAtlas = (slogans, colors) => {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_WIDTH;
  canvas.height = CELL_HEIGHT * slogans.length;
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'middle';
  slogans.forEach((text, index) => {
    const top = index * CELL_HEIGHT;
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, top, ATLAS_WIDTH, CELL_HEIGHT);
    ctx.font = "900 38px 'Arial Black', 'Helvetica Neue', Arial, sans-serif";
    // Repeat the slogan across the board with a dot between, centred, so a
    // long panel never shows one lonely word in the middle of a black strip.
    const unit = `${text}  ·  `;
    const unitWidth = Math.max(1, ctx.measureText(unit).width);
    const repeats = Math.max(1, Math.floor(ATLAS_WIDTH / unitWidth));
    const line = unit.repeat(repeats).replace(/\s+·\s+$/, '');
    const lineWidth = ctx.measureText(line).width;
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillText(line, (ATLAS_WIDTH - lineWidth) / 2, top + CELL_HEIGHT / 2 + 1);
    // Thin bezel top and bottom.
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(0, top, ATLAS_WIDTH, 2);
    ctx.fillRect(0, top + CELL_HEIGHT - 2, ATLAS_WIDTH, 2);
  });
  // LED matrix: a 1px dark lattice every 3px reads as discrete diodes up close
  // and disappears into the mip chain at distance.
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  for (let x = 0; x < ATLAS_WIDTH; x += 3) ctx.fillRect(x, 0, 1, canvas.height);
  for (let y = 0; y < canvas.height; y += 3) ctx.fillRect(0, y, ATLAS_WIDTH, 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

// True when `outward` points to the driver's right. Facing a right-hand wall
// the driver's left is FORWARD, so its text has to run against the direction
// of travel to read left-to-right; a left-hand wall runs with it.
const UP = new THREE.Vector3(0, 1, 0);
const isRightWall = (forward, outward) => outward.dot(new THREE.Vector3().crossVectors(forward, UP)) > 0;

export const buildBarrierKit = ({ roadFrames, slogans = BARRIER_SLOGANS, trackKey }) => {
  const colors = KIT_COLORS[trackKey] || KIT_COLORS['comeback-city'];
  const meshes = [];
  const frames = roadFrames.filter((frame) => frame.section?.length >= 9);
  if (frames.length < 4) return { meshes };

  // ---- LED boards ----
  const positions = [];
  const uvs = [];
  const indices = [];
  const cellCount = slogans.length;
  let nextArc = 140;
  let boardCount = 0;
  for (let start = 0; start < frames.length - 1; start += 1) {
    const first = frames[start];
    if (first.arc < nextArc) continue;
    if (first.progress < START_CLEAR || first.progress > 1 - START_CLEAR) continue;
    let end = start;
    while (end < frames.length - 1 && frames[end].arc - first.arc < BOARD_SPAN) end += 1;
    const span = frames[end].arc - first.arc;
    if (span < BOARD_SPAN * 0.8) break;
    const sideIndex = boardCount % 2;
    const cell = boardCount % cellCount;
    const vTop = 1 - cell / cellCount;
    const vBottom = 1 - (cell + 1) / cellCount;
    const right = isRightWall(first.forward, first.sides[sideIndex].outward);
    for (let ring = start; ring <= end; ring += 1) {
      const frame = frames[ring];
      const side = frame.sides[sideIndex];
      const faceU = frame.section[7].u - BOARD_INSET;
      const x = side.origin.x + side.outward.x * faceU;
      const z = side.origin.z + side.outward.z * faceU;
      const t = (frame.arc - first.arc) / span;
      const u = right ? 1 - t : t;
      const base = positions.length / 3;
      positions.push(x, side.origin.y + BOARD_BOTTOM, z, x, side.origin.y + BOARD_TOP, z);
      uvs.push(u, vBottom, u, vTop);
      if (ring > start) indices.push(base - 2, base, base - 1, base - 1, base, base + 1);
    }
    boardCount += 1;
    nextArc = first.arc + BOARD_PITCH;
  }
  if (indices.length) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    const boards = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        // Over 1.0 so the lit letters reach the bloom threshold like LEDs;
        // the near-black panel stays near-black.
        color: new THREE.Color(1.55, 1.55, 1.55),
        map: makeSloganAtlas(slogans, colors),
        side: THREE.DoubleSide,
      })
    );
    boards.userData.kind = 'barrier-led-boards';
    boards.userData.boardCount = boardCount;
    meshes.push(boards);
  }

  // ---- Rhythm posts ----
  const postGeometry = (() => {
    const pole = new THREE.BoxGeometry(0.32, POST_HEIGHT, 0.32);
    pole.translate(0, POST_HEIGHT / 2, 0);
    const lamp = new THREE.BoxGeometry(0.62, 0.42, 0.62);
    lamp.translate(0, POST_HEIGHT + 0.21, 0);
    const paint = (geometry, value) => {
      const count = geometry.attributes.position.count;
      const color = new Float32Array(count * 3).fill(value);
      geometry.setAttribute('color', new THREE.BufferAttribute(color, 3));
      geometry.deleteAttribute('normal');
      geometry.deleteAttribute('uv');
    };
    // Dark pole, over-bright lamp: the instance colour tints both, so the pole
    // stays a dark stroke and only the lamp carries the accent.
    paint(pole, 0.16);
    paint(lamp, 1.7);
    const merged = new THREE.BufferGeometry();
    const parts = [pole, lamp].map((part) => part.toNonIndexed());
    const total = parts.reduce((sum, part) => sum + part.attributes.position.count, 0);
    const position = new Float32Array(total * 3);
    const color = new Float32Array(total * 3);
    let offset = 0;
    parts.forEach((part) => {
      position.set(part.attributes.position.array, offset * 3);
      color.set(part.attributes.color.array, offset * 3);
      offset += part.attributes.position.count;
    });
    merged.setAttribute('position', new THREE.BufferAttribute(position, 3));
    merged.setAttribute('color', new THREE.BufferAttribute(color, 3));
    return merged;
  })();
  const placements = [];
  let nextPostArc = 0;
  frames.forEach((frame) => {
    if (frame.arc < nextPostArc) return;
    nextPostArc = frame.arc + POST_PITCH;
    const crestU = (frame.section[7].u + frame.section[8].u) / 2;
    const crestY = frame.section[8].y;
    frame.sides.forEach((side) => {
      placements.push({
        x: side.origin.x + side.outward.x * crestU,
        y: side.origin.y + crestY,
        z: side.origin.z + side.outward.z * crestU,
      });
    });
  });
  if (placements.length) {
    const posts = new THREE.InstancedMesh(
      postGeometry,
      new THREE.MeshBasicMaterial({ vertexColors: true }),
      placements.length
    );
    const matrix = new THREE.Matrix4();
    const tint = new THREE.Color();
    placements.forEach((placement, index) => {
      matrix.makeTranslation(placement.x, placement.y, placement.z);
      posts.setMatrixAt(index, matrix);
      posts.setColorAt(index, tint.set(colors[Math.floor(index / 2) % 2]));
    });
    posts.instanceMatrix.needsUpdate = true;
    if (posts.instanceColor) posts.instanceColor.needsUpdate = true;
    posts.computeBoundingSphere();
    posts.userData.kind = 'barrier-rhythm-posts';
    meshes.push(posts);
  }
  return { meshes };
};
