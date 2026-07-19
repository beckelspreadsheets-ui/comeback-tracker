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
  return createKartModelV2({
    accent,
    color,
    driverSuit: '#0f172a',
    scale,
    suit: '#202837',
  });
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
    driverSuit: profile.avatar?.suit || '#111827',
    scale: 0.96,
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
      scale: 0.62,
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
