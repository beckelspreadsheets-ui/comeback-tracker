import * as THREE from 'three';

export const BILLBOARD_TEXT_STYLE = {
  background: 'rgba(7, 17, 27, 0.82)',
  canvasHeight: 128,
  canvasWidth: 512,
  font: '900 42px ui-monospace, SFMono-Regular, Menlo, monospace',
  opacity: 0.82,
  scale: { x: 16, y: 4, z: 1 },
  strokeInset: 10,
  strokeWidth: 8,
  textBaselineOffset: 4,
};

export const createBillboardText = (
  text,
  color = '#fff8d5',
  { documentRef = globalThis.document } = {}
) => {
  const canvas = documentRef.createElement('canvas');
  canvas.width = BILLBOARD_TEXT_STYLE.canvasWidth;
  canvas.height = BILLBOARD_TEXT_STYLE.canvasHeight;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = BILLBOARD_TEXT_STYLE.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      depthWrite: false,
      map: texture,
      opacity: BILLBOARD_TEXT_STYLE.opacity,
      transparent: true,
    })
  );
  sprite.scale.set(BILLBOARD_TEXT_STYLE.scale.x, BILLBOARD_TEXT_STYLE.scale.y, BILLBOARD_TEXT_STYLE.scale.z);
  return sprite;
};
