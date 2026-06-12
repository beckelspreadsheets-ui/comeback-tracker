import * as THREE from 'three';

export const CITY3D_PALETTE = {
  cyan: '#46d9ef',
  garage: '#2cc8ff',
  gym: '#80ff62',
  clinic: '#ff5b68',
  food: '#ffac32',
  lab: '#d45cff',
  light: '#f7fbff',
  navy: '#061522',
  redKart: '#ef4334',
  roadLine: '#ffd34f',
  tire: '#0b1019',
};

export const DISTRICT_3D_DATA = {
  gym: {
    accent: CITY3D_PALETTE.gym,
    base: '#3ca75b',
    dark: '#1f5f35',
    icon: 'dumbbell',
    label: 'GYM',
    roof: '#e9f7ce',
  },
  food: {
    accent: CITY3D_PALETTE.food,
    base: '#f28b2e',
    dark: '#9d4516',
    icon: 'utensils',
    label: 'FOOD COURT',
    roof: '#fff0b0',
  },
  lab: {
    accent: CITY3D_PALETTE.lab,
    base: '#8a53df',
    dark: '#38206f',
    icon: 'flask',
    label: 'LAB',
    roof: '#f0e2ff',
  },
  clinic: {
    accent: CITY3D_PALETTE.clinic,
    base: '#e64b4b',
    dark: '#7c202c',
    icon: 'cross',
    label: 'CLINIC',
    roof: '#f3ece0',
  },
  garage: {
    accent: CITY3D_PALETTE.garage,
    base: '#2677d8',
    dark: '#143d78',
    icon: 'wrench',
    label: 'GARAGE',
    roof: '#e4f8ff',
  },
};

export const createBasicMaterial = (color, options = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    metalness: 0.02,
    roughness: 0.68,
    ...options,
  });

export const createBillboardText = (text, color = CITY3D_PALETTE.light, options = {}) => {
  const canvas = document.createElement('canvas');
  canvas.width = options.width || 512;
  canvas.height = options.height || 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = options.background || 'rgba(7, 17, 27, 0.86)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = options.strokeWidth || 8;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  ctx.font = options.font || '900 42px Impact, Arial Black, ui-sans-serif, system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = options.textColor || CITY3D_PALETTE.light;
  ctx.shadowColor = 'rgba(0,0,0,0.38)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;
  ctx.fillText(String(text).toUpperCase(), canvas.width / 2, canvas.height / 2 + 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      depthWrite: false,
      map: texture,
      opacity: options.opacity ?? 0.92,
      transparent: true,
    })
  );
  sprite.scale.set(options.scaleX || 16, options.scaleY || 4, 1);
  return sprite;
};

const freezeStaticTransform = (object) => {
  object.updateMatrix();
  object.matrixAutoUpdate = false;
  return object;
};

const addBox = (group, size, position, material, options = {}) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.position.set(position.x || 0, position.y || 0, position.z || 0);
  mesh.rotation.set(position.rx || 0, position.ry || 0, position.rz || 0);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  if (options.kind) mesh.userData.kind = options.kind;
  freezeStaticTransform(mesh);
  group.add(mesh);
  return mesh;
};

const addCylinder = (group, radius, depth, position, material, options = {}) => {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius.top ?? radius, radius.bottom ?? radius, depth, radius.segments || 16),
    material
  );
  mesh.position.set(position.x || 0, position.y || 0, position.z || 0);
  mesh.rotation.set(position.rx || 0, position.ry || 0, position.rz || 0);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  if (options.kind) mesh.userData.kind = options.kind;
  freezeStaticTransform(mesh);
  group.add(mesh);
  return mesh;
};

export const createKartModelV2 = ({
  accent = CITY3D_PALETTE.cyan,
  color = CITY3D_PALETTE.redKart,
  scale = 1,
  suit = '#202837',
} = {}) => {
  const group = new THREE.Group();
  group.scale.setScalar(scale);

  const bodyMat = createBasicMaterial(color, { emissive: color, emissiveIntensity: 0.1 });
  const redDarkMat = createBasicMaterial('#a91f1d', { emissive: color, emissiveIntensity: 0.04 });
  const accentMat = createBasicMaterial(accent, { emissive: accent, emissiveIntensity: 0.52 });
  const darkMat = createBasicMaterial(CITY3D_PALETTE.tire);
  const cockpitMat = createBasicMaterial('#202837');
  const trimMat = createBasicMaterial(CITY3D_PALETTE.light);
  const headlightMat = createBasicMaterial(CITY3D_PALETTE.cyan, {
    emissive: CITY3D_PALETTE.cyan,
    emissiveIntensity: 0.9,
  });
  const yellowMat = createBasicMaterial(CITY3D_PALETTE.roadLine, {
    emissive: CITY3D_PALETTE.roadLine,
    emissiveIntensity: 0.2,
  });
  const suitMat = createBasicMaterial(suit);

  addBox(group, { x: 7.8, y: 1.2, z: 8.4 }, { y: 1.35, z: -0.45 }, redDarkMat);
  addBox(group, { x: 6.9, y: 1.0, z: 6.2 }, { y: 2.05, z: 1.1 }, bodyMat);
  addBox(group, { x: 4.6, y: 1.7, z: 3.5 }, { y: 3.15, z: -1.8 }, cockpitMat);
  addBox(group, { x: 5.2, y: 0.42, z: 0.78 }, { y: 4.1, z: -3.6 }, darkMat);
  addBox(group, { x: 8.8, y: 0.54, z: 1.1 }, { y: 1.42, z: 4.95 }, trimMat);
  addBox(group, { x: 7.8, y: 0.42, z: 1.0 }, { y: 1.08, z: -5.1 }, darkMat);
  addBox(group, { x: 1.05, y: 0.32, z: 7.1 }, { y: 2.7, z: 0.75 }, trimMat);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(3.95, 5.7, 4), bodyMat);
  nose.position.set(0, 1.65, 5.9);
  nose.rotation.x = Math.PI / 2;
  nose.rotation.y = Math.PI / 4;
  nose.castShadow = true;
  group.add(nose);

  const noseStripe = new THREE.Mesh(new THREE.ConeGeometry(1.05, 5.82, 4), trimMat);
  noseStripe.position.set(0, 1.96, 5.96);
  noseStripe.rotation.x = Math.PI / 2;
  noseStripe.rotation.y = Math.PI / 4;
  noseStripe.scale.z = 1.02;
  noseStripe.castShadow = true;
  group.add(noseStripe);

  [-1, 1].forEach((side) => {
    addBox(group, { x: 1.45, y: 0.52, z: 1.18 }, { x: side * 2.65, y: 2.46, z: 5.68 }, headlightMat);
    addBox(group, { x: 1.5, y: 0.75, z: 5.8 }, { x: side * 4.55, y: 1.95, z: 0.2 }, darkMat);
    addBox(group, { x: 0.72, y: 0.5, z: 5.7 }, { x: side * 5.0, y: 2.18, z: 0.35 }, accentMat);
    addBox(group, { x: 1.2, y: 0.42, z: 3.2 }, { x: side * 3.7, y: 2.35, z: 2.7 }, bodyMat);
    addBox(group, { x: 0.52, y: 0.38, z: 3.6 }, { x: side * 3.9, y: 2.92, z: 1.82 }, trimMat);
  });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(3.55, 2.55, 2.7), cockpitMat);
  seat.position.set(0, 4.0, -2.35);
  seat.rotation.x = -0.15;
  seat.castShadow = true;
  freezeStaticTransform(seat);
  group.add(seat);

  addBox(
    group,
    { x: 2.36, y: 0.72, z: 0.18 },
    { y: 2.72, z: -5.48, rx: -0.08 },
    trimMat,
    { kind: 'player-rear-number-plate' }
  );
  [-0.42, 0.42].forEach((x) => {
    addBox(
      group,
      { x: 0.24, y: 0.56, z: 0.22 },
      { x: x * 0.78, y: 2.74, z: -5.34, rx: -0.08 },
      darkMat,
      { kind: 'player-rear-number-stroke' }
    );
  });

  const driver = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 1.12, 1.65, 7), suitMat);
  torso.position.y = 4.55;
  const helmet = new THREE.Mesh(new THREE.DodecahedronGeometry(1.12, 0), accentMat);
  helmet.position.y = 5.78;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.34, 0.18), darkMat);
  visor.position.set(0, 5.82, 0.98);
  driver.position.z = -1.85;
  freezeStaticTransform(torso);
  freezeStaticTransform(helmet);
  freezeStaticTransform(visor);
  driver.add(torso, helmet, visor);
  group.add(driver);

  [-1, 1].forEach((side) => {
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 3.8, 6), darkMat);
    cage.position.set(side * 1.88, 4.45, -2.52);
    cage.rotation.z = side * 0.18;
    group.add(cage);
  });
  addBox(group, { x: 4.25, y: 0.28, z: 0.42 }, { y: 5.98, z: -2.52 }, darkMat);

  const wheelGroup = new THREE.Group();
  const wheelMat = createBasicMaterial(CITY3D_PALETTE.tire);
  const sidewallMat = createBasicMaterial('#1b2430');
  const hubMat = createBasicMaterial(accent, { emissive: accent, emissiveIntensity: 0.38 });
  const wheels = [];
  [
    [-4.75, 1.08, -3.75],
    [4.75, 1.08, -3.75],
    [-4.75, 1.08, 3.68],
    [4.75, 1.08, 3.68],
  ].forEach(([x, y, z]) => {
    const wheel = new THREE.Group();
    wheel.position.set(x, y, z);
    wheel.userData.front = z > 0;
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.72, 1.68, 16), wheelMat);
    tire.rotation.z = Math.PI / 2;
    const sidewall = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 1.74, 16), sidewallMat);
    sidewall.rotation.z = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.86, 9), hubMat);
    hub.rotation.z = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.1, 5, 20), hubMat);
    rim.rotation.y = Math.PI / 2;
    const highlight = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.06, 5, 20), accentMat);
    highlight.rotation.y = Math.PI / 2;
    wheel.add(tire, sidewall, hub, rim, highlight);
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
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 18),
      new THREE.MeshBasicMaterial({ color: accent, opacity: 0.24, transparent: true })
    );
    glow.position.set(x, 0.18, -2.2);
    glow.rotation.x = -Math.PI / 2;
    hoverGroup.add(glow);
  });
  group.add(hoverGroup);

  const planeGroup = new THREE.Group();
  planeGroup.visible = false;
  const wing = new THREE.Mesh(new THREE.BoxGeometry(11, 0.34, 2.05), accentMat);
  wing.position.set(0, 2.25, -1.25);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.32, 1.4), accentMat);
  tail.position.set(0, 3.45, -5.25);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.25, 1.2), accentMat);
  fin.position.set(0, 4.25, -5.25);
  planeGroup.add(wing, tail, fin);
  group.add(planeGroup);

  const boostFlame = new THREE.Group();
  boostFlame.visible = false;
  [-1.1, 1.1].forEach((x) => {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.58, 3.4, 6),
      createBasicMaterial(CITY3D_PALETTE.roadLine, {
        emissive: CITY3D_PALETTE.roadLine,
        emissiveIntensity: 0.9,
      })
    );
    flame.position.set(x, 1.2, -5.35);
    flame.rotation.x = -Math.PI / 2;
    boostFlame.add(flame);
  });
  const boostBurstMaterial = new THREE.MeshBasicMaterial({
    color: CITY3D_PALETTE.cyan,
    opacity: 0.72,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  [-1, 1].forEach((side) => {
    const streak = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.28, 8.8), boostBurstMaterial.clone());
    streak.userData.kind = 'boost-burst-streak';
    streak.userData.side = side;
    streak.position.set(side * 5.7, 2.22, 0.6);
    streak.rotation.y = side * 0.1;
    streak.renderOrder = 40;
    boostFlame.add(streak);
  });
  const boostHalo = new THREE.Mesh(
    new THREE.TorusGeometry(3.2, 0.18, 6, 28),
    new THREE.MeshBasicMaterial({
      color: CITY3D_PALETTE.roadLine,
      opacity: 0.82,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
  );
  boostHalo.userData.kind = 'boost-burst-halo';
  boostHalo.position.set(0, 2.18, 1.1);
  boostHalo.rotation.x = Math.PI / 2;
  boostHalo.renderOrder = 41;
  boostFlame.add(boostHalo);
  group.add(boostFlame);

  const driftSparkGroup = new THREE.Group();
  driftSparkGroup.visible = false;
  const driftSparkMaterial = createBasicMaterial(CITY3D_PALETTE.light, {
    emissive: CITY3D_PALETTE.light,
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
    const trail = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.08, 7.4),
      new THREE.MeshBasicMaterial({
        color: CITY3D_PALETTE.cyan,
        opacity: 0.46,
        transparent: true,
        depthWrite: false,
      })
    );
    trail.position.set(side * 2.65, 0.22, -6.35);
    trail.visible = false;
    trail.userData.kind = 'drift-trail-visual';
    trail.userData.side = side;
    trail.userData.trailIndex = side > 0 ? 1 : 0;
    driftSparkGroup.add(trail);
  });
  group.add(driftSparkGroup);

  const shieldGroup = new THREE.Group();
  shieldGroup.visible = false;
  shieldGroup.name = 'player-shield-visual';
  shieldGroup.userData.kind = 'shield-visual';
  const shieldShell = new THREE.Mesh(
    new THREE.SphereGeometry(7.35, 16, 8),
    new THREE.MeshBasicMaterial({
      color: CITY3D_PALETTE.cyan,
      opacity: 0.36,
      transparent: true,
      depthWrite: false,
    })
  );
  shieldShell.scale.set(1.12, 0.64, 1.26);
  shieldShell.position.y = 3.08;
  const shieldRing = new THREE.Mesh(
    new THREE.TorusGeometry(7.15, 0.32, 6, 24),
    new THREE.MeshBasicMaterial({
      color: CITY3D_PALETTE.light,
      opacity: 0.88,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
  );
  shieldRing.position.y = 3.0;
  const shieldBurstGroup = new THREE.Group();
  shieldBurstGroup.userData.kind = 'shield-burst-crown';
  shieldBurstGroup.position.y = 8.95;
  const shieldBurstMaterial = new THREE.MeshBasicMaterial({
    color: CITY3D_PALETTE.roadLine,
    opacity: 0.96,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const shieldBurstHalo = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.24, 6, 28), shieldBurstMaterial.clone());
  shieldBurstHalo.userData.kind = 'shield-burst-halo';
  shieldBurstHalo.rotation.x = Math.PI / 2;
  shieldBurstGroup.add(shieldBurstHalo);
  [-2.8, -1.4, 0, 1.4, 2.8].forEach((x, index) => {
    const burst = new THREE.Mesh(
      new THREE.DodecahedronGeometry(index === 2 ? 1.08 : 0.76, 0),
      shieldBurstMaterial.clone()
    );
    burst.userData.kind = 'shield-burst-spark';
    burst.position.set(x, 0.42 + (index === 2 ? 0.58 : 0), -0.35 + Math.abs(x) * 0.16);
    shieldBurstGroup.add(burst);
  });
  [-0.72, 0.72].forEach((rotationZ) => {
    const flash = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.42, 0.22), shieldBurstMaterial.clone());
    flash.userData.kind = 'shield-burst-flash';
    flash.position.set(0, 0.92, -0.2);
    flash.rotation.z = rotationZ;
    shieldBurstGroup.add(flash);
  });
  shieldGroup.add(shieldShell, shieldRing, shieldBurstGroup);
  group.add(shieldGroup);

  const setMode = (mode) => {
    wheelGroup.visible = mode !== 'plane';
    hoverGroup.visible = mode === 'hover';
    planeGroup.visible = mode === 'plane';
    yellowMat.emissiveIntensity = mode === 'kart' ? 0.2 : 0.45;
  };

  return { boostFlame, driftSparkGroup, group, setMode, shieldGroup, wheels };
};

const addDistrictIcon = (group, district, y, z, size = 1) => {
  const iconGroup = new THREE.Group();
  iconGroup.position.set(0, y, z);
  const iconMat = createBasicMaterial(district.roof, {
    emissive: district.accent,
    emissiveIntensity: 0.42,
  });
  const accentMat = createBasicMaterial(district.accent, {
    emissive: district.accent,
    emissiveIntensity: 0.7,
  });
  const cyanMat = createBasicMaterial(CITY3D_PALETTE.cyan, {
    emissive: CITY3D_PALETTE.cyan,
    emissiveIntensity: 0.7,
  });

  if (district.icon === 'dumbbell') {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * size, 0.22 * size, 8.6 * size, 7), iconMat);
    bar.rotation.z = Math.PI / 2;
    iconGroup.add(bar);
    [-4.3, 4.3].forEach((x) => {
      [-0.52, 0.52].forEach((offset) => {
        addBox(iconGroup, { x: 0.82 * size, y: 2.7 * size, z: 1 * size }, { x: (x + offset) * size }, accentMat);
      });
    });
  } else if (district.icon === 'utensils') {
    [-1.6, 1.6].forEach((x, index) => {
      addBox(iconGroup, { x: 0.48 * size, y: 7.4 * size, z: 0.7 * size }, { x: x * size, rz: index === 0 ? 0.08 : -0.18 }, iconMat);
    });
    [-2.25, -1.6, -0.95].forEach((x) => {
      addBox(iconGroup, { x: 0.28 * size, y: 2.4 * size, z: 0.64 * size }, { x: x * size, y: 4 * size }, accentMat);
    });
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.95 * size, 3.4 * size, 4), accentMat);
    blade.position.set(1.95 * size, 3.7 * size, 0);
    blade.rotation.z = -0.76;
    iconGroup.add(blade);
  } else if (district.icon === 'flask') {
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.7 * size, 0.7 * size, 4.2 * size, 8), iconMat);
    neck.position.y = 2.7 * size;
    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(2.4 * size, 1.15 * size, 4.6 * size, 8), accentMat);
    bulb.position.y = -1.1 * size;
    addBox(iconGroup, { x: 3.5 * size, y: 1.1 * size, z: 0.9 * size }, { y: -2.1 * size }, cyanMat);
    iconGroup.add(neck, bulb);
  } else if (district.icon === 'cross') {
    addBox(iconGroup, { x: 2.1 * size, y: 8.4 * size, z: 0.9 * size }, {}, iconMat);
    addBox(iconGroup, { x: 7.6 * size, y: 2.1 * size, z: 0.95 * size }, {}, iconMat);
  } else if (district.icon === 'wrench') {
    addBox(iconGroup, { x: 1.1 * size, y: 8.6 * size, z: 0.8 * size }, { rz: -0.65 }, iconMat);
    const head = new THREE.Mesh(new THREE.TorusGeometry(2.05 * size, 0.35 * size, 6, 16, Math.PI * 1.35), accentMat);
    head.position.set(2.65 * size, 2.85 * size, 0);
    head.rotation.z = 0.92;
    iconGroup.add(head);
  }

  group.add(iconGroup);
  return iconGroup;
};

const addDistrictProps = (group, district, width, depth) => {
  const accentMat = createBasicMaterial(district.accent, {
    emissive: district.accent,
    emissiveIntensity: 0.42,
  });
  const baseMat = createBasicMaterial(district.base);
  const darkMat = createBasicMaterial(CITY3D_PALETTE.tire);
  const glassMat = createBasicMaterial('#dff8ff', {
    emissive: '#74f1ff',
    emissiveIntensity: 0.38,
    opacity: 0.86,
    transparent: true,
  });

  if (district.icon === 'dumbbell') {
    [-0.34, 0.34].forEach((xSide) => {
      addBox(group, { x: 4.6, y: 1.2, z: 1.2 }, { x: xSide * width, y: 1.2, z: depth / 2 + 7 }, darkMat);
      for (let plate = 0; plate < 3; plate += 1) {
        const weight = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.45, 8), accentMat);
        weight.position.set(xSide * width + plate * 1.1 - 1.1, 2.2, depth / 2 + 7);
        weight.rotation.x = Math.PI / 2;
        group.add(weight);
      }
    });
  } else if (district.icon === 'utensils') {
    [-0.35, 0.35].forEach((xSide) => {
      addBox(group, { x: 7.8, y: 4.6, z: 5.2 }, { x: xSide * width, y: 2.3, z: depth / 2 + 7.2 }, baseMat);
      addBox(group, { x: 8.6, y: 1, z: 6 }, { x: xSide * width, y: 5.1, z: depth / 2 + 7.2 }, accentMat);
    });
  } else if (district.icon === 'flask') {
    [-0.3, 0.3].forEach((xSide) => {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 10, 10), glassMat);
      tube.position.set(xSide * width, 6.2, depth * 0.08);
      group.add(tube);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.8, 10), accentMat);
      cap.position.set(xSide * width, 11.5, depth * 0.08);
      group.add(cap);
    });
  } else if (district.icon === 'cross') {
    [-0.42, 0.42].forEach((xSide) => {
      addBox(group, { x: 3.6, y: 5.4, z: 0.5 }, { x: xSide * width, y: 6.5, z: depth / 2 + 0.55 }, accentMat);
    });
  } else if (district.icon === 'wrench') {
    [-0.42, 0.42].forEach((xSide) => {
      for (let tire = 0; tire < 3; tire += 1) {
        const stack = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.45, 6, 12), darkMat);
        stack.position.set(xSide * width, 1.4 + tire * 1.25, depth / 2 + 6);
        stack.rotation.x = Math.PI / 2;
        group.add(stack);
      }
    });
  }
};

export const createDistrictModel3D = (sourceDistrict, options = {}) => {
  const district = {
    ...(DISTRICT_3D_DATA[sourceDistrict?.key] || {}),
    ...sourceDistrict,
  };
  const group = new THREE.Group();
  const scale = options.scale || 1;
  const width = options.width || (district.label === 'FOOD COURT' ? 31 : district.label === 'GARAGE' ? 34 : 29);
  const depth = options.depth || (district.label === 'LAB' ? 24 : district.label === 'GARAGE' ? 23 : 21);
  const height = options.height || (district.label === 'LAB' ? 39 : district.label === 'FOOD COURT' ? 27 : district.label === 'GARAGE' ? 29 : 31);
  const phase = options.phase || 0;
  group.scale.setScalar(scale);

  const baseMat = createBasicMaterial(district.base, {
    emissive: district.base,
    emissiveIntensity: 0.06,
  });
  const darkMat = createBasicMaterial(district.dark);
  const roofMat = createBasicMaterial(district.roof);
  const accentMat = createBasicMaterial(district.accent, {
    emissive: district.accent,
    emissiveIntensity: 0.58,
  });
  const lightMat = createBasicMaterial(CITY3D_PALETTE.light);
  const glassMat = createBasicMaterial('#dff8ff', {
    emissive: '#74f1ff',
    emissiveIntensity: 0.38,
  });

  const shadowMat = createBasicMaterial('#1f2c37', { opacity: 0.34, transparent: true });
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.86, width * 1.04, 0.36, 10), shadowMat);
  plaza.position.set(0, 0.18, depth / 2 + 4.2);
  plaza.scale.z = 0.5;
  plaza.receiveShadow = true;
  group.add(plaza);

  const facade = addBox(group, { x: width, y: height, z: depth }, { y: height / 2 + 0.6 }, baseMat);
  facade.name = `${district.key || district.label}-facade`;

  addBox(group, { x: width + 4.6, y: 2.4, z: depth + 4.8 }, { y: height + 1.7, z: 0.2 }, roofMat);
  addBox(group, { x: width * 0.78, y: height * 0.32, z: depth * 0.78 }, { y: height + height * 0.16 + 0.8, z: -depth * 0.08 }, darkMat);
  addBox(group, { x: width * 0.6, y: 2.2, z: depth * 0.86 }, { y: height + height * 0.34 + 1.8, z: -depth * 0.08 }, roofMat);

  [-1, 1].forEach((side) => {
    const towerHeight = height * (district.label === 'LAB' && side > 0 ? 1.12 : 0.82);
    addBox(group, { x: width * 0.21, y: towerHeight, z: depth * 0.66 }, { x: side * (width * 0.48), y: towerHeight / 2 + 0.6, z: depth * 0.03 }, darkMat);
    addBox(group, { x: width * 0.08, y: towerHeight * 0.84, z: depth * 0.72 }, { x: side * (width * 0.48), y: towerHeight * 0.44 + 0.8, z: depth * 0.11 }, accentMat);
    addBox(group, { x: width * 0.25, y: 1.9, z: depth * 0.75 }, { x: side * (width * 0.48), y: towerHeight + 1.4, z: depth * 0.04 }, roofMat);
  });

  const floorCount = district.label === 'LAB' ? 4 : 3;
  for (let row = 1; row <= floorCount; row += 1) {
    addBox(
      group,
      { x: width * 0.76, y: 0.54, z: 0.26 },
      { y: 3.3 + row * (height / (floorCount + 1)), z: depth / 2 + 0.2 },
      lightMat,
      { castShadow: false }
    );
  }

  [-1, 1].forEach((side) => {
    addBox(
      group,
      { x: 2.8, y: height * 0.54, z: 0.34 },
      { x: side * width * 0.29, y: height * 0.32, z: depth / 2 + 0.35 },
      darkMat,
      { castShadow: false }
    );
  });

  const rows = district.label === 'LAB' ? 6 : 4;
  const columns = district.label === 'FOOD COURT' ? 5 : 4;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if ((row + column) % 5 === 0) continue;
      addBox(
        group,
        { x: 1.55, y: 1.32, z: 0.16 },
        {
          x: -width * 0.34 + (width * 0.68 * column) / Math.max(1, columns - 1),
          y: 5.2 + row * (height / (rows + 1)),
          z: depth / 2 + 0.1,
        },
        glassMat,
        { castShadow: false }
      );
    }
  }

  const portalY = Math.min(10, height * 0.44);
  const portal = new THREE.Mesh(
    new THREE.CircleGeometry(5.3, 28),
    new THREE.MeshBasicMaterial({
      color: district.accent,
      depthWrite: false,
      opacity: 0.28,
      side: THREE.DoubleSide,
      transparent: true,
    })
  );
  portal.position.set(0, portalY, depth / 2 + 0.8);
  group.add(portal);

  const portalRing = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.5, 8, 32), accentMat);
  portalRing.position.copy(portal.position);
  group.add(portalRing);

  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.18, 5, 22), lightMat);
  innerRing.position.set(0, portalY, depth / 2 + 1.08);
  group.add(innerRing);

  const portalFrame = addBox(
    group,
    { x: 12.8, y: 1.4, z: 1.4 },
    { y: portalY - 5.5, z: depth / 2 + 0.72 },
    darkMat,
    { castShadow: false }
  );
  portalFrame.rotation.z = 0;

  const sign = createBillboardText(district.label, district.accent, {
    scaleX: district.label === 'FOOD COURT' ? 23 : 17.5,
    scaleY: 4.8,
  });
  sign.position.set(0, height + 8.8, depth / 2 + 1.9);
  group.add(sign);

  addDistrictIcon(group, district, height + 4.7, depth / 2 + 2.2, options.iconScale || 1.08);
  addDistrictProps(group, district, width, depth);

  if (district.icon === 'utensils') {
    [-0.26, 0, 0.26].forEach((offset, index) => {
      addBox(
        group,
        { x: width * 0.24, y: 1.1, z: 6.2 },
        { x: offset * width, y: height + 4.2 + index * 0.15, z: depth / 2 + 3.2, rx: 0.06 },
        index % 2 ? roofMat : accentMat
      );
    });
  }

  if (district.icon === 'flask') {
    [-0.28, 0.28].forEach((side) => {
      addCylinder(group, { top: 1.2, bottom: 1.2, segments: 12 }, 13, {
        x: side * width,
        y: height * 0.66,
        z: -depth * 0.1,
      }, glassMat);
      addCylinder(group, { top: 1.7, bottom: 1.7, segments: 12 }, 0.9, {
        x: side * width,
        y: height * 0.66 + 6.8,
        z: -depth * 0.1,
      }, accentMat);
    });
  }

  if (district.icon === 'wrench') {
    addBox(group, { x: width * 0.62, y: 8.2, z: 1.1 }, { y: 8.8, z: depth / 2 + 0.72 }, darkMat, {
      castShadow: false,
    });
  }

  const portalLight = new THREE.PointLight(district.accent, 1.45, 70, 2);
  portalLight.position.copy(portal.position);
  group.add(portalLight);

  group.userData.portalRing = portalRing;
  group.userData.innerRing = innerRing;
  group.userData.portal = portal;
  group.userData.portalLight = portalLight;
  group.userData.phase = phase;
  group.userData.animate = (time, dt) => {
    portalRing.rotation.z += dt * 0.9;
    innerRing.rotation.z -= dt * 1.35;
    portal.material.opacity = 0.2 + Math.sin(time / 190 + phase) * 0.07;
    portalLight.intensity = 1.1 + Math.sin(time / 180 + phase) * 0.32;
  };

  return group;
};

export const createObjectiveBeacon3D = ({ scale = 1 } = {}) => {
  const group = new THREE.Group();
  group.scale.setScalar(scale);
  const cyanMat = createBasicMaterial(CITY3D_PALETTE.cyan, {
    emissive: CITY3D_PALETTE.cyan,
    emissiveIntensity: 0.85,
  });
  const lightMat = createBasicMaterial(CITY3D_PALETTE.light);

  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(9.5, 11.5, 0.35, 32),
    new THREE.MeshBasicMaterial({
      color: CITY3D_PALETTE.cyan,
      opacity: 0.24,
      transparent: true,
    })
  );
  pad.position.y = 0.2;
  group.add(pad);

  const padRing = new THREE.Mesh(new THREE.TorusGeometry(10, 0.32, 6, 32), cyanMat);
  padRing.rotation.x = Math.PI / 2;
  padRing.position.y = 0.45;
  group.add(padRing);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 3.4, 92, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: CITY3D_PALETTE.cyan,
      depthWrite: false,
      opacity: 0.34,
      transparent: true,
    })
  );
  beam.position.y = 46;
  group.add(beam);

  const badgeCanvas = document.createElement('canvas');
  badgeCanvas.width = 160;
  badgeCanvas.height = 160;
  const ctx = badgeCanvas.getContext('2d');
  ctx.translate(80, 80);
  ctx.fillStyle = '#073a75';
  ctx.strokeStyle = CITY3D_PALETTE.light;
  ctx.lineWidth = 9;
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = Math.PI / 8 + (Math.PI * 2 * i) / 8;
    const x = Math.cos(angle) * 62;
    const y = Math.sin(angle) * 62;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = CITY3D_PALETTE.cyan;
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = CITY3D_PALETTE.light;
  ctx.fillRect(-27, -34, 7, 64);
  ctx.beginPath();
  ctx.moveTo(-19, -31);
  ctx.lineTo(32, -16);
  ctx.lineTo(4, 5);
  ctx.lineTo(32, 23);
  ctx.lineTo(-19, 14);
  ctx.closePath();
  ctx.fill();

  const badgeTexture = new THREE.CanvasTexture(badgeCanvas);
  badgeTexture.colorSpace = THREE.SRGBColorSpace;
  const badge = new THREE.Sprite(
    new THREE.SpriteMaterial({
      depthWrite: false,
      map: badgeTexture,
      transparent: true,
    })
  );
  badge.position.y = 33;
  badge.scale.set(19, 19, 1);
  badge.renderOrder = 5;
  group.add(badge);

  addBox(group, { x: 1.1, y: 6.4, z: 0.5 }, { x: -1.3, y: 33.4, z: 0.3 }, lightMat);
  addBox(group, { x: 5, y: 3, z: 0.45 }, { x: 1.7, y: 35.2, z: 0.4 }, cyanMat);

  group.userData.beam = beam;
  group.userData.badge = badge;
  group.userData.padRing = padRing;
  group.userData.animate = (time, dt) => {
    beam.rotation.y += dt * 0.14;
    beam.material.opacity = 0.2 + Math.sin(time / 260) * 0.05;
    badge.rotation.y += dt * 1.1;
    badge.position.y = 33 + Math.sin(time / 240) * 0.5;
    padRing.rotation.z += dt * 0.8;
  };

  return group;
};

export const createLowPolyTree = (scale = 1) => {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42 * scale, 0.62 * scale, 4.8 * scale, 6),
    createBasicMaterial('#8a5a2f')
  );
  trunk.position.y = 2.4 * scale;
  const crownA = new THREE.Mesh(
    new THREE.DodecahedronGeometry(2.25 * scale, 0),
    createBasicMaterial('#6b8d22')
  );
  crownA.position.y = 5.6 * scale;
  const crownB = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.75 * scale, 0),
    createBasicMaterial('#a6c73b')
  );
  crownB.position.set(0.42 * scale, 7.0 * scale, 0.15 * scale);
  group.add(trunk, crownA, crownB);
  return group;
};
