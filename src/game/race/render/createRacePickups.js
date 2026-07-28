// LEGACY - NOT THE SHIPPED GAME. Editing this file changes nothing the
// owner ever sees. The racer that ships is the ComebackCityThreeKartRace.jsx
// monolith, which imports NONE of this module tree (its only render-layer
// imports are raceParticles / toonRimShader / gltfLoader / createRaceScene
// (renderer+canvas fit only) / createBasicMaterial).
//
// The shipped item boxes and hazards are built in the monolith from the
// item-box GLBs. Kept: npm run test:race imports this directly.

import * as THREE from 'three';
import { ITEM_COLORS } from '../../raceItems.js';
import { getHazardDefinition } from '../../raceHazards.js';
import { layerAltitude } from '../track/trackGeometry.js';
import { createBasicMaterial } from './createKartModel.js';

export const createTrackBananaMaterial = () =>
  createBasicMaterial('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 0.16 });

export const createDroppedBananaMaterial = () =>
  createBasicMaterial('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 0.18 });

export const createTrackBananaMesh = ({ banana, material, world } = {}) => {
  const group = new THREE.Group();
  group.position.copy(banana.position);
  group.position.y = 1.25;
  const fruit = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.22, 6, 18, Math.PI * 1.3), material);
  fruit.rotation.x = Math.PI / 2;
  fruit.rotation.z = -0.8;
  group.add(fruit);
  world.add(group);
  return group;
};

export const createItemBoxMesh = ({ balloon, world } = {}) => {
  const group = new THREE.Group();
  group.position.copy(balloon.position);
  group.position.y = 3.25;
  const mat = createBasicMaterial(balloon.type.color, {
    emissive: balloon.type.color,
    emissiveIntensity: 0.92,
  });
  const cube = new THREE.Mesh(new THREE.BoxGeometry(2.7, 2.7, 2.7), mat);
  cube.rotation.set(0.55, 0.72, 0.2);
  cube.castShadow = true;
  group.add(cube);
  world.add(group);
  return group;
};

export const createFlightGateMesh = ({
  cleanCityCourse = false,
  compiled = {},
  defaultVehicle = 'kart',
  gate,
  index = 0,
  world,
} = {}) => {
  const group = new THREE.Group();
  const radius = Math.max(7.4, compiled.roadWidth * 0.23);
  const gateColor = index % 2 === 0 ? compiled.accent || '#2cc8ff' : '#2cc8ff';
  const ringMat = new THREE.MeshBasicMaterial({
    color: gateColor,
    depthWrite: false,
    opacity: 0.72,
    transparent: true,
  });
  const glowMat = new THREE.MeshBasicMaterial({
    color: gateColor,
    depthWrite: false,
    opacity: 0.14,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.36, 8, 40), ringMat);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.88, 36), glowMat);
  const postMat = createBasicMaterial('#f7fbff', { emissive: gateColor, emissiveIntensity: 0.18 });
  const arrowMat = createBasicMaterial('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 0.42 });

  [-1, 1].forEach((side) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.48, radius * 1.35, 0.48), postMat);
    post.position.set(side * radius * 0.76, -radius * 0.1, 0);
    group.add(post);
  });
  [-1.6, 0, 1.6].forEach((x) => {
    const arrow = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.38, 0.72), arrowMat);
    arrow.position.set(x, -radius * 0.42, 0.06);
    arrow.rotation.z = -0.72;
    group.add(arrow);
  });

  group.add(glow, ring);
  group.position.copy(gate.position);
  group.position.y = gate.altitude;
  group.rotation.y = Math.atan2(gate.tangent.x, gate.tangent.z);
  group.visible = cleanCityCourse ? defaultVehicle === 'plane' : defaultVehicle === 'plane' || index % 3 === 0;
  world.add(group);
  return { glow, group, ring };
};

export const createSwitchPadMesh = ({ pad, world } = {}) => {
  const group = new THREE.Group();
  const color = pad.targetVehicle === 'plane' ? '#2cc8ff' : pad.targetVehicle === 'hover' ? '#4ade80' : '#ffd34f';
  const mat = createBasicMaterial(color, { emissive: color, emissiveIntensity: 0.46 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 0.28, 24), mat);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.2, 3), createBasicMaterial('#f7fbff'));
  arrow.position.y = 0.35;
  arrow.rotation.x = Math.PI / 2;
  group.add(base, arrow);
  group.position.copy(pad.position);
  group.position.y = 0.52 + layerAltitude(pad.layer) * 0.12;
  group.rotation.y = Math.atan2(pad.tangent.x, pad.tangent.z);
  world.add(group);
  return group;
};

export const createTrackHazardMesh = ({ hazard, world } = {}) => {
  const definition = hazard.definition || getHazardDefinition(hazard.type);
  const color =
    hazard.color ||
    (definition?.effect === 'blind'
      ? '#f7fbff'
      : definition?.effect === 'boost'
      ? '#4ade80'
      : definition?.effect === 'pull'
      ? '#c879ff'
      : '#f45b69');
  const mat = createBasicMaterial(color, { emissive: color, emissiveIntensity: 0.28 });
  const geometry =
    hazard.type === 'lightning' || hazard.type === 'stalactite'
      ? new THREE.ConeGeometry(Math.max(1.2, hazard.radius * 0.12), Math.max(5, hazard.radius * 0.38), 7)
      : new THREE.CylinderGeometry(Math.max(1.5, hazard.radius * 0.2), Math.max(1.5, hazard.radius * 0.2), 0.22, 18);
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.copy(hazard.position);
  mesh.position.y = 0.72 + layerAltitude(hazard.layer) * 0.22;
  mesh.castShadow = true;
  world.add(mesh);
  return mesh;
};

export const createRacePickupMeshes = ({
  cleanCityCourse = false,
  compiled,
  defaultVehicle = 'kart',
  race,
  world,
} = {}) => {
  const bananaMat = createTrackBananaMaterial();
  return {
    balloonMeshes: race.balloons.map((balloon) => createItemBoxMesh({ balloon, world })),
    bananaMeshes: race.bananas.map((banana) => createTrackBananaMesh({ banana, material: bananaMat, world })),
    flightGateMeshes: (cleanCityCourse ? [] : race.flightGates).map((gate, index) =>
      createFlightGateMesh({
        cleanCityCourse,
        compiled,
        defaultVehicle,
        gate,
        index,
        world,
      })
    ),
    switchPadMeshes: (cleanCityCourse ? [] : race.switchPads).map((pad) => createSwitchPadMesh({ pad, world })),
    trackHazardMeshes: race.trackHazards.map((hazard) => createTrackHazardMesh({ hazard, world })),
  };
};

export const createDroppedBananaMesh = ({ banana, material, world } = {}) => {
  const group = new THREE.Group();
  group.position.copy(banana.position);
  group.position.y = 1.08;
  const fruit = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.18, 6, 16, Math.PI * 1.28), material);
  fruit.rotation.x = Math.PI / 2;
  fruit.rotation.z = -0.8;
  group.add(fruit);
  world.add(group);
  return group;
};

export const createDroppedTrapMesh = ({ hazard, itemKey, level = 1, world } = {}) => {
  const color = ITEM_COLORS[itemKey] || '#10151d';
  const mesh = new THREE.Mesh(
    itemKey === 'bubbleTrap'
      ? new THREE.SphereGeometry(1.8 + level * 0.34, 16, 12)
      : new THREE.CylinderGeometry(1.9 + level * 0.32, 1.9 + level * 0.32, 0.22, 14),
    createBasicMaterial(color, {
      emissive: color,
      emissiveIntensity: itemKey === 'bubbleTrap' ? 0.32 : 0.08,
      opacity: itemKey === 'bubbleTrap' ? 0.62 : 1,
      transparent: itemKey === 'bubbleTrap',
    })
  );
  mesh.position.copy(hazard.position);
  mesh.position.y = itemKey === 'bubbleTrap' ? 3.1 : 0.48;
  world.add(mesh);
  return mesh;
};
