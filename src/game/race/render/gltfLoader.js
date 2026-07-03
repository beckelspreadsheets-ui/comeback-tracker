import { LoadingManager } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export const createGameGltfLoader = ({ manager = null, resourceMap = null } = {}) => {
  const loadingManager = manager || (resourceMap ? createResourceMapManager(resourceMap) : undefined);
  const loader = new GLTFLoader(loadingManager);
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader;
};

const createResourceMapManager = (resourceMap) => {
  const manager = new LoadingManager();
  manager.setURLModifier((url) => {
    for (const [suffix, replacement] of Object.entries(resourceMap)) {
      if (url.endsWith(suffix)) return replacement;
    }
    return url;
  });
  return manager;
};
