// LEGACY - NOT THE SHIPPED GAME. Editing this file changes nothing the
// owner ever sees. The racer that ships is the ComebackCityThreeKartRace.jsx
// monolith, which imports NONE of this module tree (its only render-layer
// imports are raceParticles / toonRimShader / gltfLoader / createRaceScene
// (renderer+canvas fit only) / createBasicMaterial).
//
// The shipped billboards/signage are canvas textures built in the monolith.
// Kept: npm run test:race imports this directly (and createTrackMesh.js /
// createRaceScenery.js, both legacy, still call it).

import * as THREE from 'three';

export const BILLBOARD_TEXT_STYLE = {
  accentBarHeight: 11,
  background: '#050d16',
  canvasHeight: 96,
  canvasWidth: 384,
  font: '900 34px ui-monospace, SFMono-Regular, Menlo, monospace',
  innerBackground: '#0a1826',
  opacity: 0.94,
  scale: { x: 16, y: 4, z: 1 },
  strokeInset: 8,
  strokeWidth: 8,
  textBaselineOffset: 3,
};

const billboardAssetCache = new WeakMap();

export const configureRaceCanvasTexture = (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  return texture;
};

const billboardAssetCacheFor = (documentRef) => {
  let cache = billboardAssetCache.get(documentRef);
  if (!cache) {
    cache = new Map();
    billboardAssetCache.set(documentRef, cache);
  }
  return cache;
};

const billboardTextureKeyFor = (text, color) => `${color}::${text.toUpperCase()}`;

const createBillboardTexture = (text, color, documentRef) => {
  const canvas = documentRef.createElement('canvas');
  canvas.width = BILLBOARD_TEXT_STYLE.canvasWidth;
  canvas.height = BILLBOARD_TEXT_STYLE.canvasHeight;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = BILLBOARD_TEXT_STYLE.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, BILLBOARD_TEXT_STYLE.accentBarHeight);
  ctx.fillRect(0, canvas.height - BILLBOARD_TEXT_STYLE.accentBarHeight, canvas.width, BILLBOARD_TEXT_STYLE.accentBarHeight);
  ctx.fillStyle = BILLBOARD_TEXT_STYLE.innerBackground;
  ctx.fillRect(14, 18, canvas.width - 28, canvas.height - 36);
  ctx.strokeStyle = color;
  ctx.lineWidth = BILLBOARD_TEXT_STYLE.strokeWidth;
  ctx.strokeRect(
    BILLBOARD_TEXT_STYLE.strokeInset,
    BILLBOARD_TEXT_STYLE.strokeInset,
    canvas.width - BILLBOARD_TEXT_STYLE.strokeInset * 2,
    canvas.height - BILLBOARD_TEXT_STYLE.strokeInset * 2
  );
  ctx.font = BILLBOARD_TEXT_STYLE.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2 + BILLBOARD_TEXT_STYLE.textBaselineOffset);

  return configureRaceCanvasTexture(new THREE.CanvasTexture(canvas));
};

export const createBillboardText = (
  text,
  color = '#fff8d5',
  { documentRef = globalThis.document } = {}
) => {
  const cache = billboardAssetCacheFor(documentRef);
  const textureKey = billboardTextureKeyFor(text, color);
  let asset = cache.get(textureKey);
  if (!asset) {
    const texture = createBillboardTexture(text, color, documentRef);
    asset = {
      material: new THREE.SpriteMaterial({
        depthTest: false,
        depthWrite: false,
        map: texture,
        opacity: BILLBOARD_TEXT_STYLE.opacity,
        transparent: true,
      }),
      texture,
    };
    cache.set(textureKey, asset);
  }
  const sprite = new THREE.Sprite(asset.material);
  sprite.scale.set(BILLBOARD_TEXT_STYLE.scale.x, BILLBOARD_TEXT_STYLE.scale.y, BILLBOARD_TEXT_STYLE.scale.z);
  return sprite;
};
