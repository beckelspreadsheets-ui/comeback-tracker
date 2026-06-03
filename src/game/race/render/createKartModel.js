import * as THREE from 'three';

const DEFAULT_VEHICLE_PALETTE = {
  cyan: '#46d9ef',
  redKart: '#ef4334',
  tire: '#0b1019',
};

export const createBasicMaterial = (color, options = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    metalness: 0.02,
    roughness: 0.68,
    ...options,
  });

export const createVehicleModel = ({
  accent = '#2cc8ff',
  color = '#ef4334',
  palette = DEFAULT_VEHICLE_PALETTE,
  scale = 1,
  suit = '#202837',
} = {}) => {
  const group = new THREE.Group();
  group.scale.setScalar(scale);

  const chassis = color || palette.redKart;
  const glow = accent || palette.cyan;
  const bodyMat = createBasicMaterial(chassis, { emissive: chassis, emissiveIntensity: 0.1 });
  const accentMat = createBasicMaterial(glow, { emissive: glow, emissiveIntensity: 0.48 });
  const darkMat = createBasicMaterial(palette.tire);
  const cockpitMat = createBasicMaterial('#202837');
  const trimMat = createBasicMaterial('#f6fbff');
  const headlightMat = createBasicMaterial(palette.cyan, {
    emissive: palette.cyan,
    emissiveIntensity: 0.78,
  });
  const suitMat = createBasicMaterial(suit);

  const addBox = (size, position, material = bodyMat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
    mesh.position.set(position.x || 0, position.y || 0, position.z || 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  addBox({ x: 7.4, y: 1.25, z: 9.8 }, { y: 1.48, z: 0.15 }, bodyMat);
  addBox({ x: 6.6, y: 0.8, z: 5.1 }, { y: 2.22, z: 2.15 }, bodyMat);
  addBox({ x: 4.7, y: 1.95, z: 3.5 }, { y: 3.28, z: -1.45 }, cockpitMat);
  addBox({ x: 7.8, y: 0.46, z: 1.15 }, { y: 2.18, z: 4.95 }, trimMat);
  addBox({ x: 7.2, y: 0.38, z: 1.05 }, { y: 1.16, z: -5.1 }, darkMat);
  addBox({ x: 3.4, y: 0.42, z: 1.2 }, { y: 2.62, z: 5.18 }, headlightMat);
  [-1, 1].forEach((side) => {
    addBox({ x: 1.35, y: 0.46, z: 1.12 }, { x: side * 2.6, y: 2.46, z: 5.52 }, headlightMat);
    addBox({ x: 0.58, y: 0.6, z: 6.5 }, { x: side * 4.42, y: 1.95, z: -0.2 }, darkMat);
    addBox({ x: 0.72, y: 0.46, z: 5.8 }, { x: side * 4.84, y: 2.2, z: 0.35 }, accentMat);
  });

  const nose = new THREE.Mesh(new THREE.ConeGeometry(3.55, 5.2, 4), bodyMat);
  nose.position.set(0, 1.55, 5.95);
  nose.rotation.x = Math.PI / 2;
  nose.rotation.y = Math.PI / 4;
  nose.castShadow = true;
  group.add(nose);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.34, 8.2), trimMat);
  stripe.position.set(0, 2.94, 1.25);
  stripe.castShadow = true;
  group.add(stripe);

  const driver = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 1.12, 1.65, 7), suitMat);
  torso.position.y = 4.15;
  const helmet = new THREE.Mesh(new THREE.DodecahedronGeometry(1.14, 0), accentMat);
  helmet.position.y = 5.38;
  driver.position.z = -1.9;
  driver.add(torso, helmet);
  group.add(driver);

  [-1, 1].forEach((side) => {
    const cage = new THREE.Mesh(new THREE.BoxGeometry(0.34, 3.4, 0.34), darkMat);
    cage.position.set(side * 1.85, 4.2, -2.2);
    cage.rotation.z = side * 0.14;
    group.add(cage);
  });
  addBox({ x: 4.2, y: 0.32, z: 0.44 }, { y: 5.72, z: -2.18 }, darkMat);

  const wheelGroup = new THREE.Group();
  const wheelMat = createBasicMaterial(palette.tire);
  const hubMat = createBasicMaterial(glow, { emissive: glow, emissiveIntensity: 0.34 });
  const wheels = [];
  [
    [-4.4, 1.02, -3.55],
    [4.4, 1.02, -3.55],
    [-4.4, 1.02, 3.65],
    [4.4, 1.02, 3.65],
  ].forEach(([x, y, z]) => {
    const wheel = new THREE.Group();
    wheel.position.set(x, y, z);
    wheel.userData.front = z > 0;
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.62, 1.48, 14), wheelMat);
    tire.rotation.z = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 1.62, 9), hubMat);
    hub.rotation.z = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.11, 5, 18), hubMat);
    rim.rotation.y = Math.PI / 2;
    wheel.add(tire, hub, rim);
    wheelGroup.add(wheel);
    wheels.push(wheel);
  });
  group.add(wheelGroup);

  const hoverGroup = new THREE.Group();
  hoverGroup.visible = false;
  [-2.7, 2.7].forEach((x) => {
    const fan = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.18, 6, 18), accentMat);
    fan.position.set(x, 0.85, -2.2);
    fan.rotation.x = Math.PI / 2;
    hoverGroup.add(fan);
    const glowDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 18),
      new THREE.MeshBasicMaterial({ color: accent, opacity: 0.24, transparent: true })
    );
    glowDisc.position.set(x, 0.18, -2.2);
    glowDisc.rotation.x = -Math.PI / 2;
    hoverGroup.add(glowDisc);
  });
  group.add(hoverGroup);

  const planeGroup = new THREE.Group();
  planeGroup.visible = false;
  const wing = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.34, 2.0), accentMat);
  wing.position.set(0, 2.2, -1.2);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.32, 1.4), accentMat);
  tail.position.set(0, 3.35, -5.2);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.2, 1.2), accentMat);
  fin.position.set(0, 4.2, -5.2);
  planeGroup.add(wing, tail, fin);
  group.add(planeGroup);

  const boostFlame = new THREE.Group();
  boostFlame.visible = false;
  [-1.1, 1.1].forEach((x) => {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 3.2, 6),
      createBasicMaterial('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 0.9 })
    );
    flame.position.set(x, 1.2, -5.2);
    flame.rotation.x = -Math.PI / 2;
    boostFlame.add(flame);
  });
  group.add(boostFlame);

  const driftSparkGroup = new THREE.Group();
  driftSparkGroup.visible = false;
  const driftSparkMaterial = createBasicMaterial('#f7fbff', {
    emissive: '#f7fbff',
    emissiveIntensity: 0.86,
  });
  [-1, 1].forEach((side) => {
    for (let index = 0; index < 4; index += 1) {
      const spark = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34 + index * 0.08, 0), driftSparkMaterial.clone());
      spark.position.set(side * (3.85 + index * 0.22), 0.92 + index * 0.2, -3.6 - index * 0.78);
      spark.userData.side = side;
      spark.userData.phase = index * 0.62;
      driftSparkGroup.add(spark);
    }
  });
  group.add(driftSparkGroup);

  const setMode = (mode) => {
    wheelGroup.visible = mode !== 'plane';
    hoverGroup.visible = mode === 'hover';
    planeGroup.visible = mode === 'plane';
  };

  return { boostFlame, driftSparkGroup, group, setMode, wheels };
};
