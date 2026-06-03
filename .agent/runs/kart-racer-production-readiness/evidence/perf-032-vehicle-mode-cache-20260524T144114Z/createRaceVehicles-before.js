import * as THREE from 'three';
import {
  CITY3D_PALETTE,
  createBasicMaterial,
  createKartModelV2,
} from '../../city3dAssets.js';

const freezeStaticTransform = (object) => {
  object.updateMatrix();
  object.matrixAutoUpdate = false;
  return object;
};

const addStaticBox = (group, size, position, material, options = {}) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.position.set(position.x || 0, position.y || 0, position.z || 0);
  mesh.rotation.set(position.rx || 0, position.ry || 0, position.rz || 0);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  freezeStaticTransform(mesh);
  group.add(mesh);
  return mesh;
};

const addStaticMesh = (group, mesh, position = {}) => {
  mesh.position.set(position.x || 0, position.y || 0, position.z || 0);
  mesh.rotation.set(position.rx || 0, position.ry || 0, position.rz || 0);
  mesh.castShadow = position.castShadow ?? true;
  mesh.receiveShadow = position.receiveShadow ?? true;
  freezeStaticTransform(mesh);
  group.add(mesh);
  return mesh;
};

export const createRivalKartModel = ({
  accent = '#46d9ef',
  color = '#ef4334',
  scale = 1,
} = {}) => {
  const group = new THREE.Group();
  group.scale.setScalar(scale);

  const bodyMat = createBasicMaterial(color, { emissive: color, emissiveIntensity: 0.08 });
  const accentMat = createBasicMaterial(accent, { emissive: accent, emissiveIntensity: 0.42 });
  const cockpitMat = createBasicMaterial('#202837');
  const darkMat = createBasicMaterial(CITY3D_PALETTE.tire);
  const trimMat = createBasicMaterial(CITY3D_PALETTE.light);
  const flameMat = createBasicMaterial(CITY3D_PALETTE.roadLine, {
    emissive: CITY3D_PALETTE.roadLine,
    emissiveIntensity: 0.85,
  });

  addStaticBox(group, { x: 7.2, y: 1.1, z: 7.5 }, { y: 1.35, z: -0.35 }, bodyMat);
  addStaticBox(group, { x: 5.2, y: 1.25, z: 3.2 }, { y: 2.3, z: -1.55 }, darkMat);
  addStaticBox(group, { x: 7.8, y: 0.42, z: 1 }, { y: 1.3, z: 4.45 }, trimMat);
  addStaticMesh(
    group,
    new THREE.Mesh(new THREE.ConeGeometry(3.2, 4.7, 4), bodyMat),
    { rx: Math.PI / 2, ry: Math.PI / 4, y: 1.6, z: 5.25 }
  );
  addStaticMesh(
    group,
    new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.94, 1.45, 6), cockpitMat),
    { y: 3.72, z: -1.8 }
  );
  addStaticMesh(
    group,
    new THREE.Mesh(new THREE.DodecahedronGeometry(1.04, 0), accentMat),
    { y: 4.78, z: -1.8 }
  );
  addStaticBox(group, { x: 1.1, y: 0.28, z: 0.16 }, { y: 4.84, z: -0.92 }, darkMat);

  const wheelGroup = new THREE.Group();
  const wheels = [];
  [
    [-4.2, 1.02, -3.1],
    [4.2, 1.02, -3.1],
    [-4.2, 1.02, 3.15],
    [4.2, 1.02, 3.15],
  ].forEach(([x, y, z]) => {
    const wheel = new THREE.Group();
    wheel.position.set(x, y, z);
    wheel.userData.front = z > 0;
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 1.18, 10), darkMat);
    tire.rotation.z = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.3, 7), accentMat);
    hub.rotation.z = Math.PI / 2;
    freezeStaticTransform(tire);
    freezeStaticTransform(hub);
    wheel.add(tire, hub);
    wheelGroup.add(wheel);
    wheels.push(wheel);
  });
  group.add(wheelGroup);

  const hoverGroup = new THREE.Group();
  hoverGroup.visible = false;
  [-2.4, 2.4].forEach((x) => {
    addStaticMesh(
      hoverGroup,
      new THREE.Mesh(
        new THREE.CircleGeometry(1.24, 14),
        new THREE.MeshBasicMaterial({ color: accent, opacity: 0.26, transparent: true })
      ),
      { rx: -Math.PI / 2, x, y: 0.18, z: -2 }
    );
  });
  group.add(hoverGroup);

  const planeGroup = new THREE.Group();
  planeGroup.visible = false;
  addStaticBox(planeGroup, { x: 9.2, y: 0.3, z: 1.75 }, { y: 2.1, z: -1.1 }, accentMat);
  addStaticBox(planeGroup, { x: 3.5, y: 0.28, z: 1.1 }, { y: 3.1, z: -4.6 }, accentMat);
  addStaticBox(planeGroup, { x: 0.34, y: 1.85, z: 1.0 }, { y: 3.76, z: -4.6 }, accentMat);
  group.add(planeGroup);

  const boostFlame = new THREE.Group();
  boostFlame.visible = false;
  [-0.9, 0.9].forEach((x) => {
    addStaticMesh(
      boostFlame,
      new THREE.Mesh(new THREE.ConeGeometry(0.46, 2.8, 5), flameMat),
      { rx: -Math.PI / 2, x, y: 1.05, z: -4.8 }
    );
  });
  group.add(boostFlame);

  const setMode = (mode) => {
    wheelGroup.visible = mode !== 'plane';
    hoverGroup.visible = mode === 'hover';
    planeGroup.visible = mode === 'plane';
  };

  return {
    boostFlame,
    group,
    setMode,
    wheels,
  };
};

export const createVehicleSwitchRing = () => {
  const switchRing = new THREE.Mesh(
    new THREE.TorusGeometry(7.2, 0.28, 8, 40),
    new THREE.MeshBasicMaterial({ color: '#ffd34f', depthWrite: false, opacity: 0.75, transparent: true })
  );
  switchRing.rotation.x = Math.PI / 2;
  switchRing.visible = false;
  return switchRing;
};

export const createRaceVehicleMeshes = ({
  defaultVehicle = 'kart',
  profile = {},
  race,
  world,
} = {}) => {
  const playerVehicle = createKartModelV2({
    accent: '#46d9ef',
    color: '#ef4334',
    scale: 0.84,
    suit: profile.avatar?.suit || '#202837',
  });
  playerVehicle.setMode(race.player.vehicleMode);
  world.add(playerVehicle.group);

  const switchRing = createVehicleSwitchRing();
  playerVehicle.group.add(switchRing);

  const rivalModels = race.rivals.map((rival) => {
    const model = createRivalKartModel({
      accent: rival.accent,
      color: rival.color,
      scale: 0.48,
    });
    model.setMode(defaultVehicle);
    world.add(model.group);
    return model;
  });

  return {
    playerVehicle,
    rivalModels,
    switchRing,
  };
};
