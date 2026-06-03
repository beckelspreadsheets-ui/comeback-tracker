import * as THREE from 'three';
import { resolveDroppedRaceHazard } from '../raceHazards.js';
import {
  getItemDefinition,
  resolveBananaScatterForRacer,
} from '../raceItems.js';
import {
  createDroppedBananaMesh,
  createDroppedTrapMesh,
} from './render/createRacePickups.js';

export const spawnDroppedRaceBanana = ({
  material,
  meshes = [],
  position,
  race,
  velocity = new THREE.Vector3(),
  world,
} = {}) => {
  if (!race || !position) return null;
  const banana = {
    life: 18,
    position: position.clone(),
    radius: 3.4,
    velocity: velocity.clone(),
  };
  race.droppedBananas.push(banana);
  const mesh = createDroppedBananaMesh({ banana, material, world });
  meshes.push({ banana, mesh });
  return banana;
};

export const scatterDroppedRaceBananas = ({
  amount = 3,
  material,
  meshes = [],
  race,
  racer,
  world,
} = {}) => {
  if (!race || !racer) return null;
  const scatter = resolveBananaScatterForRacer({ amount, racer });
  scatter.drops.forEach((drop) => {
    spawnDroppedRaceBanana({
      material,
      meshes,
      position: new THREE.Vector3(drop.position.x, drop.position.y, drop.position.z),
      race,
      velocity: new THREE.Vector3(drop.velocity.x, drop.velocity.y, drop.velocity.z),
      world,
    });
  });
  return scatter;
};

export const spawnDroppedRaceTrap = ({
  itemKey,
  level = 1,
  meshes = [],
  options = {},
  race,
  racer,
  world,
} = {}) => {
  if (!race || !racer || !itemKey) return null;
  const definition = getItemDefinition(itemKey);
  const hazardDescriptor = resolveDroppedRaceHazard({
    definition,
    heading: racer.heading,
    itemKey,
    level,
    options,
    owner: racer,
    position: racer.position,
  });
  const hazard = {
    ...hazardDescriptor,
    position: new THREE.Vector3(
      hazardDescriptor.position.x,
      hazardDescriptor.position.y,
      hazardDescriptor.position.z
    ),
  };
  race.droppedHazards.push(hazard);
  const mesh = createDroppedTrapMesh({ hazard, itemKey, level, world });
  meshes.push({ hazard, mesh });
  return hazard;
};

export const createRaceDropRuntime = ({
  droppedBananaMat,
  droppedBananaMeshes = [],
  race,
  trapMeshes = [],
  world,
} = {}) => ({
  dropTrap: (racer, itemKey, level = 1, options = {}) =>
    spawnDroppedRaceTrap({
      itemKey,
      level,
      meshes: trapMeshes,
      options,
      race,
      racer,
      world,
    }),
  scatterBananas: (racer, amount = 3) =>
    scatterDroppedRaceBananas({
      amount,
      material: droppedBananaMat,
      meshes: droppedBananaMeshes,
      race,
      racer,
      world,
    }),
  spawnDroppedBanana: (position, velocity = new THREE.Vector3()) =>
    spawnDroppedRaceBanana({
      material: droppedBananaMat,
      meshes: droppedBananaMeshes,
      position,
      race,
      velocity,
      world,
    }),
});
