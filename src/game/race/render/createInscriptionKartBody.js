// Inscription karts (Ordinals rebuild, M2) — a NEW kart silhouette, not the
// retired hero/card kart: a low open-wheel rover with a pointed nose, an
// exposed cockpit, glowing inscription-rune side strips, and twin rear fins
// instead of a wing. Three liveried variants keyed to the Ordinal drivers:
//   orbit-rover  (isethius) — rocket nose, splayed rocket fins
//   deck-runner  (t-clow)   — boat prow, single sail fin
//   mesa-strider (layer23)  — blade splitter, joined arch fin
// Rendering only: wheels, flames, VFX, shadow, and the driver mount stay in
// the race component's proven rig; this module returns the swappable body.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const VARIANTS = {
  'orbit-rover': { nose: 'rocket', fins: 'rocket' },
  'deck-runner': { nose: 'prow', fins: 'sail' },
  'mesa-strider': { nose: 'blade', fins: 'arch' },
};

export const createInscriptionKartBody = ({ accent = '#2ee6c8', color = '#ff8b21', gfx = { name: 'off' }, kartKey = 'orbit-rover', kit }) => {
  const variant = VARIANTS[kartKey] || VARIANTS['orbit-rover'];
  const body = new THREE.Group();
  body.userData.kind = `inscription-kart-body-${kartKey}`;

  const usePbr = gfx.name === 'high';
  const bodyMat = usePbr
    ? kit.applyHeroRim(
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.16, metalness: 0.42, roughness: 0.34 })
      )
    : kit.createToonMaterial(color, { emissive: color, emissiveIntensity: 0.2 });
  const darkMat = kit.createToonMaterial('#161224');
  const trimMat = kit.createToonMaterial('#f4f0ff');
  const seatMat = kit.createToonMaterial('#1d1830');
  const glowMat = kit.createBasicMaterial(accent, { emissive: accent, emissiveIntensity: 1.1 });
  const runeMat = kit.createBasicMaterial(accent, { emissive: accent, emissiveIntensity: 0.85 });

  const add = (mesh, x, y, z, rx = 0, ry = 0, rz = 0) => {
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    body.add(mesh);
    return mesh;
  };
  const rbox = (w, h, d, material, radius = 0.3) =>
    new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 1, Math.min(radius, Math.min(w, h, d) * 0.34)), material);

  // Low wedge chassis — longer and lower than the retired tub, with a
  // tapered plan so the kart reads planted, not bulbous.
  add(rbox(6.2, 1.5, 10.2, bodyMat, 0.5), 0, 2.35, 0.1);
  add(rbox(5.6, 0.8, 5.6, bodyMat, 0.28), 0, 3.1, 2.4, -0.1);

  // Nose per variant.
  if (variant.nose === 'rocket') {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.5, 5.4, 10), bodyMat);
    add(cone, 0, 2.6, 6.9, Math.PI / 2);
    add(rbox(1.1, 0.5, 2.6, glowMat, 0.2), 0, 3.1, 6.2, -0.08); // nose light spine
  } else if (variant.nose === 'prow') {
    const prow = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 3.0, 6.0, 4, 1), bodyMat);
    add(prow, 0, 2.7, 6.8, Math.PI / 2, Math.PI / 4);
    add(rbox(4.4, 0.45, 0.5, trimMat, 0.16), 0, 3.4, 5.4); // gunwale stripe
  } else {
    add(rbox(6.8, 0.5, 2.8, bodyMat, 0.18), 0, 1.9, 6.2, 0.06); // blade splitter
    add(rbox(6.2, 0.3, 0.6, glowMat, 0.12), 0, 2.3, 7.3);
  }

  // Inscription-rune side strips: short uneven glowing bars like carved
  // glyphs — the kart family's namesake detail.
  [-1, 1].forEach((side) => {
    add(rbox(0.9, 1.05, 5.2, darkMat, 0.2), side * 3.6, 2.0, 0.1);
    for (let index = 0; index < 4; index += 1) {
      const len = 0.5 + ((index * 37) % 10) / 14;
      add(rbox(0.14, 0.3, len, runeMat, 0.06), side * 4.08, 2.15, -1.8 + index * 1.15);
    }
  });

  // Open cockpit: bucket seat, headrest, accent piping, steering wheel.
  add(rbox(3.6, 0.5, 3.4, darkMat, 0.2), 0, 3.4, -0.7);
  add(rbox(3.3, 0.6, 2.7, seatMat, 0.25), 0, 3.55, -1.5);
  add(rbox(3.3, 2.4, 1.0, seatMat, 0.32), 0, 4.65, -2.75, 0.12);
  [-1, 1].forEach((side) => add(rbox(0.55, 1.9, 1.15, seatMat, 0.2), side * 1.6, 4.5, -2.45, 0.12));
  add(rbox(2.0, 1.05, 0.9, seatMat, 0.32), 0, 6.1, -2.92);
  add(rbox(2.6, 0.18, 0.18, glowMat, 0.06), 0, 5.5, -2.48, 0.12);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.17, 6, 14), darkMat);
  add(wheel, 0, 4.3, 0.75, -0.55);
  add(rbox(0.32, 1.4, 0.32, trimMat, 0.1), 0, 3.7, 1.05, 0.5);

  // Rear deck + fins per variant (NO wing — the retired kart's silhouette).
  add(rbox(6.0, 0.7, 2.6, bodyMat, 0.24), 0, 3.6, -4.3);
  if (variant.fins === 'rocket') {
    [-1, 1].forEach((side) => {
      add(rbox(0.5, 2.8, 1.8, bodyMat, 0.16), side * 2.4, 5.2, -4.5, -0.18, 0, side * 0.3);
      add(rbox(0.2, 1.6, 1.0, glowMat, 0.08), side * 2.85, 5.4, -4.6, -0.18, 0, side * 0.3);
    });
  } else if (variant.fins === 'sail') {
    const sail = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 2.2, 4.2, 3, 1), darkMat);
    add(sail, 0, 6.2, -4.4, 0.12, Math.PI / 6);
    add(rbox(0.5, 3.2, 0.5, bodyMat, 0.16), 0, 5.4, -4.5, 0.12);
  } else {
    [-1, 1].forEach((side) => add(rbox(0.5, 2.4, 1.6, bodyMat, 0.16), side * 2.4, 5.0, -4.5, -0.12));
    add(rbox(5.3, 0.5, 1.4, bodyMat, 0.18), 0, 6.1, -4.7); // joined arch top
    add(rbox(3.2, 0.2, 0.8, glowMat, 0.08), 0, 6.42, -4.7);
  }

  // Rear bumper, light bar, exhausts (flames stay in the component rig and
  // line up at x ±1.5, y 2.1, z −5.45/−6.4 — unchanged).
  add(rbox(6.6, 1.0, 0.9, darkMat, 0.24), 0, 2.2, -5.15);
  add(rbox(4.2, 0.4, 0.26, kit.createBasicMaterial('#ff4a3d', { emissive: '#ff4a3d', emissiveIntensity: 1.0 }), 0.1), 0, 2.9, -5.4);
  [-1.5, 1.5].forEach((x) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.54, 1.2, 8), trimMat);
    add(pipe, x, 2.1, -5.55, Math.PI / 2);
  });

  // Front bumper + headlight strip.
  add(rbox(6.5, 0.8, 0.7, darkMat, 0.2), 0, 1.7, 5.6);
  add(rbox(4.0, 0.5, 0.3, glowMat, 0.1), 0, 2.5, 5.9);

  return body;
};

export const INSCRIPTION_KART_KEYS = Object.keys(VARIANTS);
