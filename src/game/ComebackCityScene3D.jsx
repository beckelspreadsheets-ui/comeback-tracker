import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  CITY3D_PALETTE,
  DISTRICT_3D_DATA,
  createBasicMaterial,
  createBillboardText,
  createDistrictModel3D,
  createKartModelV2,
  createLowPolyTree,
  createObjectiveBeacon3D,
} from './city3dAssets.js';
import plazaReferenceSpec from '../assets/game/plaza-reference-spec.json';
import plazaSceneShapes from '../assets/game/plaza-scene-shapes.json';
import generatedClinicFacadeUrl from '../assets/game/generated/district-facade-clinic.png';
import generatedFoodFacadeUrl from '../assets/game/generated/district-facade-food.png';
import generatedGarageFacadeUrl from '../assets/game/generated/district-facade-garage.png';
import generatedGymFacadeUrl from '../assets/game/generated/district-facade-gym.png';
import generatedLabFacadeUrl from '../assets/game/generated/district-facade-lab.png';

const DISTRICT_ORDER = ['gym', 'food', 'lab', 'clinic', 'garage'];
const GENERATED_DISTRICT_FACADE_URLS = {
  clinic: generatedClinicFacadeUrl,
  food: generatedFoodFacadeUrl,
  garage: generatedGarageFacadeUrl,
  gym: generatedGymFacadeUrl,
  lab: generatedLabFacadeUrl,
};

const GENERATED_DISTRICT_FACADE_ALPHA_BOUNDS = {
  clinic: { width: 353, height: 341, bounds: { x: 8, y: 12, width: 345, height: 317 } },
  food: { width: 340, height: 316, bounds: { x: 8, y: 12, width: 332, height: 292 } },
  garage: { width: 332, height: 328, bounds: { x: 0, y: 12, width: 320, height: 304 } },
  gym: { width: 341, height: 326, bounds: { x: 12, y: 12, width: 329, height: 302 } },
  lab: { width: 317, height: 325, bounds: { x: 0, y: 12, width: 317, height: 301 } },
};

const fitTextureAlphaBoundsToBox = (box, textureBounds) => {
  if (!textureBounds?.bounds) return box;
  const { bounds, width, height } = textureBounds;
  const fittedWidth = box.width * (width / bounds.width);
  const fittedHeight = box.height * (height / bounds.height);
  return {
    x: box.x - (bounds.x / width) * fittedWidth,
    y: box.y - (bounds.y / height) * fittedHeight,
    width: fittedWidth,
    height: fittedHeight,
  };
};

const generatedDistrictFacadeTextureCache = new Map();

const getGeneratedDistrictFacadeTexture = (key) => {
  const url = GENERATED_DISTRICT_FACADE_URLS[key];
  if (!url) return null;
  if (!generatedDistrictFacadeTextureCache.has(key)) {
    const texture = new THREE.TextureLoader().load(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    generatedDistrictFacadeTextureCache.set(key, texture);
  }
  return generatedDistrictFacadeTextureCache.get(key);
};

const addLights = (scene) => {
  scene.add(new THREE.HemisphereLight('#fff8cf', '#2085a4', 3.25));
  const sun = new THREE.DirectionalLight('#fff2b9', 3.9);
  sun.position.set(-72, 120, 76);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -180;
  sun.shadow.camera.right = 180;
  sun.shadow.camera.top = 180;
  sun.shadow.camera.bottom = -180;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(CITY3D_PALETTE.cyan, 1.2);
  rim.position.set(92, 64, -82);
  scene.add(rim);
};

const createSkyTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#3aa6e4');
  gradient.addColorStop(0.46, '#78d7ff');
  gradient.addColorStop(1, '#ddfbff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  return texture;
};

const PLAZA_SCREEN = plazaReferenceSpec.source.size;
const PLAZA_HALF_W = PLAZA_SCREEN.width / 2;
const PLAZA_HALF_H = PLAZA_SCREEN.height / 2;

const screenX = (x) => x - PLAZA_HALF_W;
const screenY = (y) => PLAZA_HALF_H - y;

const screenMaterial = (color, options = {}) =>
  new THREE.MeshBasicMaterial({
    color,
    depthTest: options.depthTest ?? true,
    depthWrite: options.depthWrite ?? true,
    opacity: options.opacity ?? 1,
    side: THREE.DoubleSide,
    transparent: options.transparent ?? (options.opacity !== undefined && options.opacity < 1),
  });

const screenLitMaterial = (color, options = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    emissive: options.emissive || '#000000',
    emissiveIntensity: options.emissiveIntensity ?? 0,
    metalness: options.metalness ?? 0.04,
    opacity: options.opacity ?? 1,
    roughness: options.roughness ?? 0.68,
    side: THREE.DoubleSide,
    transparent: options.transparent ?? (options.opacity !== undefined && options.opacity < 1),
  });

const textureMaterial = (texture, options = {}) =>
  new THREE.MeshBasicMaterial({
    alphaTest: options.alphaTest ?? 0,
    depthTest: options.depthTest ?? true,
    depthWrite: options.depthWrite ?? false,
    map: texture,
    opacity: options.opacity ?? 1,
    side: THREE.DoubleSide,
    transparent: true,
  });

const addScreenRect = (group, box, z, material, options = {}) => {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(box.width, box.height), material);
  mesh.position.set(screenX(box.x + box.width / 2), screenY(box.y + box.height / 2), z);
  mesh.rotation.z = ((options.angleDegrees || 0) * Math.PI) / 180;
  mesh.renderOrder = options.renderOrder || 0;
  group.add(mesh);
  return mesh;
};

const addScreenBox3D = (group, box, z, depth, palette, options = {}) => {
  const createMaterial = options.lit === false ? screenMaterial : screenLitMaterial;
  const materialBase = {
    opacity: options.opacity,
    transparent: options.opacity !== undefined && options.opacity < 1,
  };
  const front = createMaterial(palette.front, { ...materialBase, roughness: 0.62 });
  const side = createMaterial(palette.side || palette.front, { ...materialBase, roughness: 0.78 });
  const top = createMaterial(palette.top || palette.front, { ...materialBase, roughness: 0.5 });
  const bottom = createMaterial(palette.bottom || palette.side || palette.front, { ...materialBase, roughness: 0.84 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(box.width, box.height, depth), [side, side, top, bottom, front, side]);
  mesh.position.set(screenX(box.x + box.width / 2), screenY(box.y + box.height / 2), z);
  mesh.rotation.set(((options.pitchDegrees || 0) * Math.PI) / 180, ((options.yawDegrees || 0) * Math.PI) / 180, ((options.rollDegrees || 0) * Math.PI) / 180);
  mesh.renderOrder = options.renderOrder || 0;
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  group.add(mesh);
  return mesh;
};

const addScreenEllipse = (group, box, z, material, options = {}) => {
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.5, options.segments || 72), material);
  mesh.scale.set(box.width, box.height, 1);
  mesh.position.set(screenX(box.x + box.width / 2), screenY(box.y + box.height / 2), z);
  mesh.renderOrder = options.renderOrder || 0;
  group.add(mesh);
  return mesh;
};

const addScreenPolygon = (group, points, z, material, options = {}) => {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => {
    const wx = screenX(x);
    const wy = screenY(y);
    if (index === 0) shape.moveTo(wx, wy);
    else shape.lineTo(wx, wy);
  });
  shape.closePath();
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
  mesh.position.z = z;
  mesh.renderOrder = options.renderOrder || 0;
  group.add(mesh);
  return mesh;
};

const ellipseRingSegmentPoints = (box, innerInset, startAngle, endAngle, segments = 42) => {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const rx = box.width / 2;
  const ry = box.height / 2;
  const innerRx = Math.max(1, rx - innerInset.x);
  const innerRy = Math.max(1, ry - innerInset.y);
  const points = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = startAngle + ((endAngle - startAngle) * index) / segments;
    points.push([cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry]);
  }
  for (let index = segments; index >= 0; index -= 1) {
    const angle = startAngle + ((endAngle - startAngle) * index) / segments;
    points.push([cx + Math.cos(angle) * innerRx, cy + Math.sin(angle) * innerRy]);
  }
  return points;
};

const addScreenEllipseRingSegment = (group, box, innerInset, startAngle, endAngle, z, material, options = {}) =>
  addScreenPolygon(group, ellipseRingSegmentPoints(box, innerInset, startAngle, endAngle, options.segments || 42), z, material, options);

const createScreenTaperedRibbonGeometry = (pixelPoints, startWidth, endWidth = startWidth) => {
  const points = pixelPoints.map(([x, y]) => ({ x: screenX(x), y: screenY(y) }));
  const vertices = [];
  const indices = [];
  const normals = points.map((point, index) => {
    const prev = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const length = Math.max(0.001, Math.hypot(dx, dy));
    return { x: -dy / length, y: dx / length };
  });

  points.forEach((point, index) => {
    const normal = normals[index];
    const t = points.length <= 1 ? 0 : index / (points.length - 1);
    const width = startWidth + (endWidth - startWidth) * t;
    vertices.push(point.x + normal.x * width * 0.5, point.y + normal.y * width * 0.5, 0);
    vertices.push(point.x - normal.x * width * 0.5, point.y - normal.y * width * 0.5, 0);
  });

  for (let index = 0; index < points.length - 1; index += 1) {
    const a = index * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

const createScreenRibbonGeometry = (pixelPoints, width) => createScreenTaperedRibbonGeometry(pixelPoints, width, width);

const sampleScreenPolyline = (polyline, divisions = 80) => {
  const curve = new THREE.CatmullRomCurve3(
    polyline.map(([x, y]) => new THREE.Vector3(x, y, 0)),
    false,
    'catmullrom',
    0.2
  );
  return curve.getSpacedPoints(divisions).map((point) => [point.x, point.y]);
};

const addScreenRoad = (world, road, materials, options = {}) => {
  const sampled = sampleScreenPolyline(road.polyline, options.divisions || Math.max(42, road.polyline.length * 14));
  world.userData.roadCurves ||= {};
  world.userData.roadCurves[road.id] = {
    points: road.polyline.map(([x, y]) => ({ x: screenX(x), y: screenY(y), z: options.telemetryZ || 42 })),
    width: road.width,
  };

  const startWidth = road.width * (options.startScale ?? 1);
  const endWidth = road.width * (options.endScale ?? 1);
  const curbStartWidth = startWidth + (options.curbWidthStart ?? options.curbWidth ?? 20);
  const curbEndWidth = endWidth + (options.curbWidthEnd ?? options.curbWidth ?? 20);
  const curb = new THREE.Mesh(createScreenTaperedRibbonGeometry(sampled, curbStartWidth, curbEndWidth), materials.curb);
  curb.position.z = options.z || 18;
  world.add(curb);
  const asphalt = new THREE.Mesh(createScreenTaperedRibbonGeometry(sampled, startWidth, endWidth), materials.asphalt);
  asphalt.position.z = (options.z || 18) + 1;
  world.add(asphalt);

  if (options.centerLine !== false) {
    const dashEvery = options.dashEvery || 46;
    for (let index = 12; index < sampled.length - 8; index += Math.max(6, Math.floor(dashEvery / 6))) {
      const [x, y] = sampled[index];
      const [nx, ny] = sampled[Math.min(sampled.length - 1, index + 1)];
      const angle = (Math.atan2(screenY(ny) - screenY(y), screenX(nx) - screenX(x)) * 180) / Math.PI;
      addScreenRect(
        world,
        { x: x - 9, y: y - 1.4, width: 18, height: 2.8 },
        (options.z || 18) + 2,
        materials.line,
        { angleDegrees: -angle }
      );
    }
  }
};

const createLabelTexture = (text, accent = CITY3D_PALETTE.cyan, options = {}) => {
  const canvas = document.createElement('canvas');
  canvas.width = options.width || 512;
  canvas.height = options.height || 160;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = options.background || 'rgba(5, 19, 32, 0.92)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = accent;
  ctx.lineWidth = options.strokeWidth || 10;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.fillStyle = options.textColor || '#f7fbff';
  ctx.font = options.font || '900 78px Impact, Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 6;
  ctx.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2 + 7);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const hexToRgb = (hex) => {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return {
    b: value & 255,
    g: (value >> 8) & 255,
    r: value >> 16,
  };
};

const rgbString = ({ r, g, b }, alpha = 1) => `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;

const mixRgb = (a, b, amount) => ({
  b: a.b + (b.b - a.b) * amount,
  g: a.g + (b.g - a.g) * amount,
  r: a.r + (b.r - a.r) * amount,
});

const createPanelTexture = (base, dark, accent, options = {}) => {
  const canvas = document.createElement('canvas');
  canvas.width = options.width || 256;
  canvas.height = options.height || 256;
  const ctx = canvas.getContext('2d');
  const baseRgb = hexToRgb(base);
  const darkRgb = hexToRgb(dark);
  const lightRgb = mixRgb(baseRgb, { r: 255, g: 255, b: 255 }, 0.34);
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, rgbString(lightRgb));
  gradient.addColorStop(0.45, base);
  gradient.addColorStop(1, rgbString(mixRgb(baseRgb, darkRgb, 0.55)));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = rgbString(darkRgb, 0.22);
  ctx.fillRect(canvas.width * 0.78, 0, canvas.width * 0.22, canvas.height);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.11);
  ctx.fillStyle = rgbString(darkRgb, 0.24);
  ctx.fillRect(0, canvas.height * 0.86, canvas.width, canvas.height * 0.14);

  ctx.strokeStyle = rgbString(hexToRgb(accent), 0.22);
  ctx.lineWidth = 4;
  for (let y = canvas.height * 0.22; y < canvas.height; y += canvas.height * 0.22) {
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.08, y);
    ctx.lineTo(canvas.width * 0.92, y + canvas.height * 0.03);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.08, canvas.height * 0.1);
  ctx.lineTo(canvas.width * 0.42, canvas.height * 0.04);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const createGroundTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#a9db78');
  gradient.addColorStop(0.42, '#78c85c');
  gradient.addColorStop(1, '#53a963');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < 80; index += 1) {
    const x = (index * 83) % canvas.width;
    const y = (index * 37) % canvas.height;
    ctx.fillStyle = index % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(40,100,45,0.06)';
    ctx.fillRect(x, y, 28 + (index % 5) * 12, 3);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const drawIconCanvas = (icon, accent, background = 'rgba(4, 17, 29, 0)') => {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(80, 80);
  ctx.fillStyle = background;
  ctx.fillRect(-80, -80, 160, 160);
  ctx.strokeStyle = '#f7fbff';
  ctx.fillStyle = '#f7fbff';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = accent;
  ctx.shadowBlur = 12;

  if (icon === 'dumbbell') {
    ctx.beginPath();
    ctx.moveTo(-48, 0);
    ctx.lineTo(48, 0);
    ctx.stroke();
    [-58, -40, 40, 58].forEach((x) => {
      ctx.fillRect(x - 5, -26, 10, 52);
    });
  } else if (icon === 'utensils') {
    ctx.beginPath();
    ctx.moveTo(-22, -42);
    ctx.lineTo(-22, 46);
    ctx.moveTo(-44, -42);
    ctx.lineTo(-44, 6);
    ctx.moveTo(0, -42);
    ctx.lineTo(0, 6);
    ctx.moveTo(-44, 4);
    ctx.lineTo(0, 4);
    ctx.moveTo(32, -45);
    ctx.lineTo(32, 46);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(38, -20, 18, 30, -0.25, 0, Math.PI * 2);
    ctx.stroke();
  } else if (icon === 'flask') {
    ctx.beginPath();
    ctx.moveTo(-18, -52);
    ctx.lineTo(18, -52);
    ctx.lineTo(18, -12);
    ctx.lineTo(48, 46);
    ctx.lineTo(-48, 46);
    ctx.lineTo(-18, -12);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.72;
    ctx.fillRect(-30, 16, 60, 20);
    ctx.globalAlpha = 1;
  } else if (icon === 'cross') {
    ctx.fillRect(-13, -50, 26, 100);
    ctx.fillRect(-50, -13, 100, 26);
  } else if (icon === 'wrench') {
    ctx.save();
    ctx.rotate(-0.72);
    ctx.fillRect(-9, -48, 18, 92);
    ctx.beginPath();
    ctx.arc(0, -48, 30, 0.68, Math.PI * 1.82);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.moveTo(-42, -35);
    ctx.lineTo(46, -8);
    ctx.lineTo(-12, 14);
    ctx.lineTo(42, 38);
    ctx.lineTo(-42, 26);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const createPortalTexture = (icon, accent) => {
  const canvas = document.createElement('canvas');
  canvas.width = 220;
  canvas.height = 260;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);

  const glow = ctx.createRadialGradient(0, 0, 16, 0, 0, 96);
  glow.addColorStop(0, `${accent}dd`);
  glow.addColorStop(0.42, `${accent}66`);
  glow.addColorStop(1, `${accent}00`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 10, 100, 118, 0, 0, Math.PI * 2);
  ctx.fill();

  const arch = () => {
    ctx.beginPath();
    ctx.moveTo(-58, 88);
    ctx.lineTo(-58, -8);
    ctx.quadraticCurveTo(0, -72, 58, -8);
    ctx.lineTo(58, 88);
    ctx.closePath();
  };
  arch();
  ctx.fillStyle = 'rgba(4, 12, 23, 0.86)';
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 17;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 22;
  arch();
  ctx.stroke();
  ctx.strokeStyle = '#f7fbff';
  ctx.lineWidth = 4;
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.moveTo(-39, 78);
  ctx.lineTo(-39, -2);
  ctx.quadraticCurveTo(0, -48, 39, -2);
  ctx.lineTo(39, 78);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = `${accent}44`;
  ctx.fillRect(-27, 24, 54, 48);

  ctx.strokeStyle = '#f7fbff';
  ctx.fillStyle = '#f7fbff';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = accent;
  ctx.shadowBlur = 7;
  ctx.scale(0.58, 0.58);
  ctx.translate(0, 18);
  const portalIcon = null;
  if (portalIcon === 'cross') {
    ctx.fillRect(-11, -31, 22, 62);
    ctx.fillRect(-31, -11, 62, 22);
  } else if (portalIcon === 'flask') {
    ctx.beginPath();
    ctx.moveTo(-14, -36);
    ctx.lineTo(14, -36);
    ctx.lineTo(14, -7);
    ctx.lineTo(34, 34);
    ctx.lineTo(-34, 34);
    ctx.lineTo(-14, -7);
    ctx.closePath();
    ctx.stroke();
  } else if (portalIcon === 'wrench') {
    ctx.save();
    ctx.rotate(-0.72);
    ctx.fillRect(-7, -35, 14, 68);
    ctx.beginPath();
    ctx.arc(0, -38, 22, 0.68, Math.PI * 1.82);
    ctx.stroke();
    ctx.restore();
  } else if (portalIcon === 'utensils') {
    ctx.beginPath();
    ctx.moveTo(-22, -34);
    ctx.lineTo(-22, 34);
    ctx.moveTo(-38, -34);
    ctx.lineTo(-38, 0);
    ctx.moveTo(-6, -34);
    ctx.lineTo(-6, 0);
    ctx.moveTo(-38, 0);
    ctx.lineTo(-6, 0);
    ctx.moveTo(28, -35);
    ctx.lineTo(28, 34);
    ctx.stroke();
  } else if (portalIcon) {
    ctx.beginPath();
    ctx.moveTo(-38, 0);
    ctx.lineTo(38, 0);
    ctx.stroke();
    [-49, -34, 34, 49].forEach((x) => ctx.fillRect(x - 4, -20, 8, 40));
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const createBeaconBadgeTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 180;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(90, 90);
  ctx.fillStyle = '#084b8f';
  ctx.strokeStyle = '#f7fbff';
  ctx.lineWidth = 10;
  ctx.shadowColor = CITY3D_PALETTE.cyan;
  ctx.shadowBlur = 24;
  ctx.beginPath();
  for (let index = 0; index < 8; index += 1) {
    const angle = Math.PI / 8 + (Math.PI * 2 * index) / 8;
    const x = Math.cos(angle) * 79;
    const y = Math.sin(angle) * 79;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = CITY3D_PALETTE.cyan;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f7fbff';
  ctx.fillRect(-34, -43, 9, 82);
  ctx.beginPath();
  ctx.moveTo(-24, -39);
  ctx.lineTo(43, -19);
  ctx.lineTo(6, 6);
  ctx.lineTo(43, 31);
  ctx.lineTo(-24, 19);
  ctx.closePath();
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const addIconPlane = (group, icon, box, z, accent, options = {}) => {
  const texture = drawIconCanvas(icon, accent, options.background);
  return addScreenRect(group, box, z, textureMaterial(texture, { opacity: options.opacity ?? 1 }));
};

const addBox = (group, size, position, material, options = {}) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.position.set(position.x || 0, position.y || 0, position.z || 0);
  mesh.rotation.set(position.rx || 0, position.ry || 0, position.rz || 0);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  group.add(mesh);
  return mesh;
};

const addRoad = (world, x, z, w, d, yaw = 0) => {
  const asphalt = createBasicMaterial('#303944', { roughness: 0.78 });
  const shoulder = createBasicMaterial('#cbd1d5');
  const line = createBasicMaterial(CITY3D_PALETTE.roadLine, {
    emissive: CITY3D_PALETTE.roadLine,
    emissiveIntensity: 0.18,
  });
  const road = addBox(world, { x: w + 6, y: 0.16, z: d + 7 }, { x, y: 0.08, z, ry: yaw }, shoulder, { castShadow: false });
  const deck = addBox(world, { x: w, y: 0.24, z: d }, { x, y: 0.22, z, ry: yaw }, asphalt, { castShadow: false });
  const stripeCount = Math.max(2, Math.floor(d / 22));
  for (let i = 0; i < stripeCount; i += 1) {
    const stripe = addBox(world, { x: 1.1, y: 0.08, z: 9 }, { x, y: 0.42, z: z - d / 2 + 14 + i * 22, ry: yaw }, line, { castShadow: false });
    stripe.translateX(0);
  }
  return { deck, road };
};

const addCrosswalk = (world, x, z, width = 46, yaw = 0) => {
  const white = createBasicMaterial('#f7fbff');
  for (let i = 0; i < 8; i += 1) {
    addBox(
      world,
      { x: width / 9, y: 0.08, z: 2.8 },
      { x: x - width / 2 + 4 + i * (width / 8), y: 0.46, z, ry: yaw },
      white,
      { castShadow: false }
    );
  }
};

const createRoadRibbonGeometry = (points, width) => {
  const vertices = [];
  const indices = [];
  const normals = points.map((point, index) => {
    const prev = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const dx = next.x - prev.x;
    const dz = next.z - prev.z;
    const length = Math.max(0.001, Math.hypot(dx, dz));
    return { x: -dz / length, z: dx / length };
  });

  points.forEach((point, index) => {
    const normal = normals[index];
    vertices.push(point.x + normal.x * width * 0.5, 0, point.z + normal.z * width * 0.5);
    vertices.push(point.x - normal.x * width * 0.5, 0, point.z - normal.z * width * 0.5);
  });

  for (let index = 0; index < points.length - 1; index += 1) {
    const a = index * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

const sampledCurve = (points, divisions = 40) => {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'catmullrom',
    0.38
  );
  return curve.getSpacedPoints(divisions).map((point) => ({ x: point.x, z: point.z }));
};

const addRoadRibbon = (world, sourcePoints, width, y, materials, options = {}) => {
  const points = Array.isArray(sourcePoints[0]) ? sampledCurve(sourcePoints, options.divisions || 52) : sourcePoints;
  if (options.telemetryId) {
    world.userData.roadCurves ||= {};
    world.userData.roadCurves[options.telemetryId] = {
      points: points.map((point) => ({ x: point.x, y: y + 0.28, z: point.z })),
      width,
    };
  }
  const shoulder = new THREE.Mesh(createRoadRibbonGeometry(points, width + (options.curbWidth || 8), y), materials.shoulder);
  shoulder.position.y = y;
  shoulder.receiveShadow = true;
  world.add(shoulder);

  const road = new THREE.Mesh(createRoadRibbonGeometry(points, width, y + 0.06), materials.asphalt);
  road.position.y = y + 0.06;
  road.receiveShadow = true;
  world.add(road);

  if (options.centerLine !== false) {
    for (let i = 4; i < points.length - 5; i += 9) {
      const point = points[i];
      const next = points[Math.min(points.length - 1, i + 1)];
      const yaw = Math.atan2(next.x - point.x, next.z - point.z);
      addBox(
        world,
        { x: 1.1, y: 0.08, z: options.lineLength || 8.5 },
        { x: point.x, y: y + 0.22, z: point.z, ry: yaw },
        materials.line,
        { castShadow: false }
      );
    }
  }

  return { points, road, shoulder };
};

const addSkyline = (world, landmarks) => {
  const skyline = new THREE.Group();
  skyline.name = 'plaza-skyline';
  world.add(skyline);
  const mats = ['#2d76b7', '#5a91b2', '#315b8d', '#e28d47', '#8a53df', '#f3ece0'].map((color) =>
    createBasicMaterial(color)
  );
  const windowMat = createBasicMaterial('#e8fff6', {
    emissive: '#c8ffef',
    emissiveIntensity: 0.18,
    opacity: 0.78,
    transparent: true,
  });
  for (let i = 0; i < 40; i += 1) {
    const x = -190 + i * 9.8;
    const z = -144 - (i % 5) * 7;
    const h = 22 + (i % 8) * 6.1 + (i % 9 === 0 ? 28 : 0);
    const w = 6.2 + (i % 4) * 2.2;
    const d = 8 + (i % 4) * 2.1;
    const block = addBox(skyline, { x: w, y: h, z: d }, { x, y: h / 2, z, ry: (i % 3 - 1) * 0.04 }, mats[i % mats.length]);
    if (i % 5 === 0) {
      const spire = new THREE.Mesh(
        new THREE.ConeGeometry(w * 0.38, 10 + (i % 3) * 3, 5),
        i % 2 ? createBasicMaterial(CITY3D_PALETTE.cyan) : createBasicMaterial('#f7fbff')
      );
      spire.position.set(block.position.x, h + 5.2, block.position.z);
      spire.castShadow = true;
      skyline.add(spire);
    }
    if (i % 2 === 0) {
      for (let row = 0; row < Math.min(6, Math.floor(h / 8)); row += 1) {
        [-0.24, 0.24].forEach((side) => {
          addBox(
            skyline,
            { x: 0.92, y: 1.05, z: 0.16 },
            { x: x + side * w, y: 6 + row * 6.2, z: z + d / 2 + 0.1, ry: block.rotation.y },
            windowMat,
            { castShadow: false }
          );
        });
      }
    }
  }

  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(-132, 31, -132);
  wheelGroup.rotation.y = 0.05;
  const wheelMat = createBasicMaterial('#f3ece0', {
    emissive: CITY3D_PALETTE.roadLine,
    emissiveIntensity: 0.14,
  });
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(17, 0.42, 6, 36), wheelMat);
  wheelGroup.add(wheel);
  for (let i = 0; i < 10; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.34, 17, 0.34), wheelMat);
    spoke.rotation.z = (Math.PI * i) / 10;
    wheelGroup.add(spoke);
  }
  addBox(wheelGroup, { x: 0.7, y: 34, z: 0.7 }, { x: -6.2, y: -17, rz: -0.26 }, wheelMat);
  addBox(wheelGroup, { x: 0.7, y: 34, z: 0.7 }, { x: 6.2, y: -17, rz: 0.26 }, wheelMat);
  skyline.add(wheelGroup);
  landmarks.skyline = skyline;
  return skyline;
};

const addMountainsAndClouds = (world, landmarks) => {
  const mountainGroup = new THREE.Group();
  mountainGroup.name = 'plaza-mountains-clouds';
  world.add(mountainGroup);
  [-188, -134, -72, -10, 62, 126, 184].forEach((x, index) => {
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(32 + (index % 3) * 8, 56 + (index % 2) * 18, 4),
      createBasicMaterial(index % 2 ? '#9bc2d3' : '#8eb3c8')
    );
    mountain.position.set(x, 24, -210 - (index % 2) * 12);
    mountain.rotation.y = Math.PI / 4;
    mountainGroup.add(mountain);
    const snow = new THREE.Mesh(new THREE.ConeGeometry(11 + (index % 3) * 2, 17, 4), createBasicMaterial('#f7fbff'));
    snow.position.set(x, 56 + (index % 2) * 8, mountain.position.z);
    snow.rotation.y = Math.PI / 4;
    mountainGroup.add(snow);
  });

  const cloudMat = new THREE.MeshBasicMaterial({ color: '#f7fbff', opacity: 0.86, transparent: true });
  const puffGeometry = new THREE.DodecahedronGeometry(1, 0);
  [
    { x: -138, y: 92, z: -92, s: 6.5 },
    { x: -26, y: 108, z: -122, s: 4.8 },
    { x: 108, y: 94, z: -88, s: 7.2 },
    { x: 184, y: 122, z: -136, s: 5.2 },
  ].forEach((cloud, cloudIndex) => {
    const cloudGroup = new THREE.Group();
    cloudGroup.position.set(cloud.x, cloud.y, cloud.z);
    [-1.8, -0.5, 0.8, 2.0].forEach((offset, puffIndex) => {
      const puff = new THREE.Mesh(puffGeometry, cloudMat);
      puff.position.set(offset * cloud.s, Math.sin(puffIndex) * cloud.s * 0.2, 0);
      puff.scale.set(cloud.s * (0.86 + puffIndex * 0.08), cloud.s * 0.44, cloud.s * 0.34);
      cloudGroup.add(puff);
    });
    cloudGroup.userData.animate = (_time, dt) => {
      cloudGroup.position.x += dt * (0.45 + cloudIndex * 0.08);
      if (cloudGroup.position.x > 220) cloudGroup.position.x = -220;
    };
    mountainGroup.add(cloudGroup);
  });
  landmarks.mountainsClouds = mountainGroup;
  return mountainGroup;
};

const addMidgroundBlocks = (world) => {
  const mats = ['#526b7e', '#e28d47', '#4f83a8', '#7c5ac8', '#d76655', '#f0d38f', '#3a8e62'].map((color) =>
    createBasicMaterial(color, { roughness: 0.72 })
  );
  const glass = createBasicMaterial('#dbf7ff', {
    emissive: '#9ff4ff',
    emissiveIntensity: 0.2,
    opacity: 0.78,
    transparent: true,
  });
  for (let i = 0; i < 32; i += 1) {
    const row = i % 3;
    const x = -178 + (i % 16) * 23.8 + (row % 2) * 7;
    const z = -82 + row * 22 + (i % 4) * 2;
    if (x > -76 && x < 96 && z > -54) continue;
    const h = 9 + (i % 5) * 3.4 + (i % 11 === 0 ? 9 : 0);
    const w = 8 + (i % 4) * 2.2;
    const d = 8 + (i % 3) * 2.6;
    const block = addBox(world, { x: w, y: h, z: d }, { x, y: h / 2, z, ry: (i % 3 - 1) * 0.05 }, mats[i % mats.length]);
    addBox(world, { x: w + 1.2, y: 1, z: d + 1.2 }, { x, y: h + 0.5, z, ry: block.rotation.y }, i % 2 ? mats[(i + 2) % mats.length] : createBasicMaterial('#f3ece0'));
    for (let rowIndex = 0; rowIndex < Math.min(3, Math.floor(h / 5)); rowIndex += 1) {
      [-0.24, 0.24].forEach((side) => {
        addBox(
          world,
          { x: 1.1, y: 0.9, z: 0.12 },
          { x: x + side * w, y: 4 + rowIndex * 4.5, z: z + d / 2 + 0.09, ry: block.rotation.y },
          glass,
          { castShadow: false }
        );
      });
    }
  }
};

const addMeasuredMountainsAndClouds = (world, landmarks) => {
  const group = new THREE.Group();
  group.name = 'plaza-mountains-clouds';
  const mountainMat = screenMaterial('#7fb2ca', { opacity: 0.68 });
  const mountainDarkMat = screenMaterial('#659ab8', { opacity: 0.58 });
  const snowMat = screenMaterial('#f7fbff', { opacity: 0.72 });
  const cloudMat = screenMaterial('#f7fbff', { opacity: 0.9 });
  const cloudShadeMat = screenMaterial('#d8f3ff', { opacity: 0.72 });

  addScreenPolygon(
    group,
    [
      [0, 207],
      [70, 160],
      [130, 207],
      [243, 144],
      [332, 207],
      [490, 156],
      [578, 207],
      [750, 154],
      [846, 207],
      [974, 140],
      [1058, 207],
    ],
    2,
    mountainMat
  );
  addScreenPolygon(group, [[214, 204], [298, 137], [370, 204]], 3, mountainDarkMat);
  addScreenPolygon(group, [[255, 168], [298, 137], [337, 176], [304, 163], [280, 178]], 4, snowMat);
  addScreenPolygon(group, [[12, 207], [78, 158], [142, 207]], 3.1, mountainDarkMat);
  addScreenPolygon(group, [[48, 181], [78, 158], [108, 184], [82, 176], [66, 188]], 4.1, snowMat);
  addScreenPolygon(group, [[438, 207], [512, 158], [586, 207]], 3.1, screenMaterial('#73a9c4', { opacity: 0.42 }));
  addScreenPolygon(group, [[480, 181], [512, 158], [542, 184], [516, 176], [500, 189]], 4.1, screenMaterial('#f7fbff', { opacity: 0.62 }));
  addScreenPolygon(group, [[860, 204], [979, 133], [1058, 204]], 3, mountainDarkMat);
  addScreenPolygon(group, [[941, 157], [979, 133], [1019, 164], [991, 155], [969, 173]], 4, snowMat);
  [
    [18, 188, 23],
    [56, 183, 19],
  ].forEach(([x, y, height], index) => {
    addScreenRect(group, { x: x - 1, y: y - height, width: 2, height }, 6, screenMaterial('#e9f7ff', { opacity: 0.55 }));
    [0, 60, 120].forEach((angle) => {
      addScreenRect(
        group,
        { x: x - 1, y: y - height - 1, width: 2, height: 17 - index * 2 },
        6.1,
        screenMaterial('#e9f7ff', { opacity: 0.5 }),
        { angleDegrees: angle }
      );
    });
  });

  Object.entries(plazaReferenceSpec.clouds.boxes).forEach(([key, box], index) => {
    const z = 5 + index * 0.1;
    const points = [
      [box.x, box.y + box.height * 0.66],
      [box.x + box.width * 0.2, box.y + box.height * 0.33],
      [box.x + box.width * 0.36, box.y + box.height * 0.36],
      [box.x + box.width * 0.52, box.y],
      [box.x + box.width * 0.72, box.y + box.height * 0.42],
      [box.x + box.width, box.y + box.height * 0.32],
      [box.x + box.width * 0.72, box.y + box.height * 0.68],
    ];
    addScreenPolygon(group, points, z, cloudMat);
    addScreenRect(
      group,
      { x: box.x + box.width * 0.16, y: box.y + box.height * 0.62, width: box.width * 0.62, height: 5 },
      z + 0.1,
      cloudShadeMat
    );
  });

  world.add(group);
  landmarks.mountainsClouds = group;
};

const SKYLINE_MAJOR_TOWER_STYLES = {
  centerNeedle: { front: '#4f88ad', side: '#31536c', top: '#dff8ff' },
  leftGlassPair: { front: '#82bed0', side: '#416f87', top: '#f2e8cf' },
  leftSpire: { front: '#337db1', side: '#254a75', top: '#dff8ff' },
  rightBlue: { front: '#3375a8', side: '#23496e', top: '#dff8ff' },
  rightWhite: { front: '#d7edf2', side: '#8db6c6', top: '#fff8ee' },
  tallCenter: { front: '#316fa6', side: '#214c76', top: '#dff8ff' },
};

const addMeasuredSkyline = (world, landmarks) => {
  const group = new THREE.Group();
  group.name = 'plaza-skyline';
  const towerColors = ['#337db1', '#77b7c7', '#426cab', '#e3ad58', '#8e5bd9', '#d8f3ff', '#5ca0bd'];
  const windowMat = screenMaterial('#eaffef', { opacity: 0.72 });
  const band = plazaReferenceSpec.skyline.band;

  for (let index = 0; index < 62; index += 1) {
    const col = index % 31;
    const row = Math.floor(index / 31);
    const width = 12 + (index % 5) * 5;
    const height = 38 + ((index * 7) % 68) + (index % 13 === 0 ? 36 : 0);
    const x = band.x + col * (band.width / 32) + (row % 2) * 8;
    const y = 236 - height + row * 24;
    if (x < band.x || x + width > band.x + band.width) continue;
    if (x > 95 && x < 225 && y < 188) continue;
    const color = towerColors[index % towerColors.length];
    addScreenRect(group, { x, y, width, height }, 7 + row * 0.2, screenMaterial(color, { opacity: 0.9 }));
    addScreenRect(group, { x: x + 2, y: y - 5, width: width - 4, height: 7 }, 7.2 + row * 0.2, screenMaterial('#f2e8cf', { opacity: 0.78 }));
    for (let wy = y + 16; wy < y + height - 8; wy += 17) {
      for (let wx = x + 5; wx < x + width - 4; wx += 9) {
        if ((Math.floor(wx + wy) + index) % 3 !== 0) {
          addScreenRect(group, { x: wx, y: wy, width: 3, height: 5 }, 7.5 + row * 0.2, windowMat);
        }
      }
    }
  }

  Object.entries(plazaReferenceSpec.skyline.majorTowers).forEach(([id, box], index) => {
    const style = SKYLINE_MAJOR_TOWER_STYLES[id] || {
      front: towerColors[(index + 2) % towerColors.length],
      side: index % 2 ? '#31536c' : '#254a75',
      top: index % 2 ? '#f2e8cf' : '#dff8ff',
    };
    addScreenBox3D(
      group,
      box,
      9,
      16 + (index % 3) * 4,
      {
        front: style.front,
        side: style.side,
        top: style.top,
      },
      {
        opacity: 0.92,
        pitchDegrees: -2,
        yawDegrees: index % 2 ? -5 : 6,
      }
    );
    addScreenRect(
      group,
      { x: box.x + box.width * 0.72, y: box.y + 4, width: box.width * 0.24, height: box.height - 8 },
      25,
      screenMaterial('#061522', { opacity: 0.12 })
    );
    for (let y = box.y + 16; y < box.y + box.height - 10; y += 17) {
      for (let x = box.x + 6; x < box.x + box.width - 6; x += 11) {
        if ((Math.round(x + y) + index) % 4 === 0) continue;
        addScreenRect(group, { x, y, width: 3.2, height: 5.2 }, 26, screenMaterial('#dff8ff', { opacity: 0.5 }));
      }
    }
    addScreenRect(
      group,
      { x: box.x + 2, y: box.y - 5, width: Math.max(5, box.width - 4), height: 6 },
      27,
      screenMaterial(index % 2 ? '#ffd889' : '#dff8ff', { opacity: 0.62 })
    );
    if (index % 2 === 0 || id === 'rightWhite') {
      addScreenPolygon(
        group,
        [
          [box.x + box.width * 0.5, box.y - 24],
          [box.x + box.width * 0.1, box.y],
          [box.x + box.width * 0.9, box.y],
        ],
        28,
        screenMaterial('#f7fbff', { opacity: 0.88 })
      );
    }
  });

  const wheelCenter = { x: 236, y: 178 };
  const wheelMat = screenMaterial('#eff9ff', { opacity: 0.76 });
  addScreenEllipse(group, { x: wheelCenter.x - 28, y: wheelCenter.y - 28, width: 56, height: 56 }, 10, wheelMat);
  for (let index = 0; index < 12; index += 1) {
    addScreenRect(
      group,
      { x: wheelCenter.x - 1, y: wheelCenter.y - 27, width: 2, height: 54 },
      10.1,
      wheelMat,
      { angleDegrees: index * 15 }
    );
  }
  ['#ef4334', '#2cc8ff', '#ffd34f', '#f7fbff'].forEach((color, colorIndex) => {
    for (let index = colorIndex; index < 12; index += 4) {
      const angle = (Math.PI * 2 * index) / 12;
      addScreenRect(
        group,
        {
          x: wheelCenter.x + Math.cos(angle) * 29 - 2.5,
          y: wheelCenter.y + Math.sin(angle) * 29 - 2,
          width: 5,
          height: 4,
        },
        10.4,
        screenMaterial(color, { opacity: 0.72 }),
        { angleDegrees: (angle * 180) / Math.PI }
      );
    }
  });

  world.add(group);
  landmarks.skyline = group;
};

const LOWER_SKYLINE_MASSING_BLOCKS = [
  [246, 210, 34, 72, '#6f8792'],
  [286, 198, 42, 88, '#d48255'],
  [334, 205, 38, 80, '#5d8295'],
  [378, 190, 52, 98, '#d0b878'],
  [436, 204, 46, 92, '#647f93'],
  [488, 198, 44, 102, '#7a62b1'],
  [538, 206, 40, 94, '#c96a55'],
  [584, 190, 48, 114, '#526f80'],
  [638, 206, 42, 92, '#d78b56'],
  [686, 196, 52, 106, '#5c8b73'],
  [744, 202, 42, 96, '#d6b66e'],
  [792, 192, 48, 112, '#66889a'],
  [846, 205, 46, 94, '#c95f5a'],
  [898, 190, 50, 118, '#4f7d9a'],
  [954, 178, 42, 130, '#8fb1ba'],
  [1002, 204, 48, 100, '#be655f'],
  [28, 232, 34, 54, '#6e8e8f'],
  [70, 224, 42, 62, '#d1b76e'],
  [120, 214, 48, 76, '#7aa05f'],
  [174, 226, 46, 66, '#d9884f'],
];

const addMeasuredLowerSkylineMassing = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-lower-skyline-massing';

  LOWER_SKYLINE_MASSING_BLOCKS.forEach(([x, y, width, height, color], index) => {
    const z = 29 + index * 0.01;
    const dark = index % 2 ? '#172633' : '#1d3140';
    const roof = index % 3 === 0 ? '#e9cf8d' : index % 3 === 1 ? '#edf1d9' : '#7aa7b6';
    addScreenRect(group, { x, y, width, height }, z, screenMaterial(color, { opacity: 0.94 }));
    addScreenRect(group, { x: x + width * 0.68, y: y + 4, width: width * 0.28, height: height - 4 }, z + 0.04, screenMaterial(dark, { opacity: 0.56 }));
    addScreenRect(group, { x: x + 3, y: y - 5, width: Math.max(7, width - 6), height: 6 }, z + 0.08, screenMaterial(roof, { opacity: 0.84 }));
    for (let wy = y + 13; wy < y + height - 8; wy += 16) {
      for (let wx = x + 6; wx < x + width - 6; wx += 11) {
        if ((Math.round(wx + wy) + index) % 3 === 0) continue;
        addScreenRect(group, { x: wx, y: wy, width: 3, height: 5 }, z + 0.12, screenMaterial('#e4f6ff', { opacity: 0.52 }));
      }
    }
  });

  world.add(group);
};

const addMeasuredSkylineFineDetail = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-skyline-fine-detail';
  const glass = screenMaterial('#e4f8ff', { depthTest: false, depthWrite: false, opacity: 0.3 });
  const warmGlass = screenMaterial('#ffd982', { depthTest: false, depthWrite: false, opacity: 0.26 });
  const darkFacet = screenMaterial('#102f46', { depthTest: false, depthWrite: false, opacity: 0.2 });
  const roofLight = screenMaterial('#f5f4dc', { depthTest: false, depthWrite: false, opacity: 0.4 });

  Object.entries(plazaReferenceSpec.skyline.majorTowers).forEach(([id, box], towerIndex) => {
    const z = 31 + towerIndex * 0.04;
    const facetTop = box.y + 8;
    const facetHeight = Math.min(box.height - 14, 185 - facetTop);
    if (facetHeight > 2) {
      addScreenRect(
        group,
        { x: box.x + box.width * 0.72, y: facetTop, width: box.width * 0.18, height: facetHeight },
        z,
        darkFacet,
        { renderOrder: 32 }
      );
    }
    addScreenRect(
      group,
      { x: box.x + 3, y: box.y + 4, width: Math.max(5, box.width - 8), height: 4 },
      z + 0.02,
      roofLight,
      { renderOrder: 33 }
    );

    const windowW = Math.max(2.2, Math.min(4.2, box.width / 11));
    const xStep = Math.max(8, box.width / 4.6);
    const yStep = Math.max(13, box.height / 8.5);
    for (let y = box.y + 18; y < box.y + box.height - 10; y += yStep) {
      if (y >= 185) continue;
      for (let x = box.x + 6; x < box.x + box.width - 5; x += xStep) {
        if ((Math.round(x + y) + towerIndex) % 5 === 0) continue;
        addScreenRect(
          group,
          { x, y, width: windowW, height: 4.6 },
          z + 0.04,
          (id === 'tallCenter' || towerIndex % 3 === 0) ? warmGlass : glass,
          { renderOrder: 34 }
        );
      }
    }
  });

  [
    [260, 216, 82, 5, '#efb168', 0.24],
    [365, 209, 88, 5, '#dff8ff', 0.2],
    [500, 218, 92, 5, '#cdb9ff', 0.19],
    [635, 216, 86, 5, '#efb168', 0.22],
    [782, 218, 92, 5, '#f0d38f', 0.2],
    [905, 212, 110, 5, '#dff8ff', 0.2],
  ].forEach(([x, y, width, height, color, opacity], index) => {
    if (y >= 185) return;
    addScreenRect(
      group,
      { x, y, width, height },
      30.7 + index * 0.02,
      screenMaterial(color, { depthTest: false, depthWrite: false, opacity }),
      { renderOrder: 35 }
    );
  });

  const wheelCenter = { x: 236, y: 178 };
  const wheelRing = screenMaterial('#f3f8f3', { depthTest: false, depthWrite: false, opacity: 0.12 });
  addScreenEllipseRingSegment(
    group,
    { x: wheelCenter.x - 29, y: wheelCenter.y - 29, width: 58, height: 58 },
    { x: 3, y: 3 },
    0,
    Math.PI * 2,
    31.4,
    wheelRing,
    { renderOrder: 36, segments: 80 }
  );
  for (let index = 0; index < 12; index += 1) {
    const angle = (Math.PI * 2 * index) / 12;
    const x = wheelCenter.x + Math.cos(angle) * 29;
    const y = wheelCenter.y + Math.sin(angle) * 29;
    addMeasuredRoadLine(group, [[wheelCenter.x, wheelCenter.y], [x, y]], 1.2, 31.5 + index * 0.002, '#f3f8f3', {
      depthTest: false,
      depthWrite: false,
      divisions: 2,
      opacity: 0.08,
    });
    if (index % 2 === 0) {
      addScreenRect(
        group,
        { x: x - 2.5, y: y - 2, width: 5, height: 4 },
        31.7,
        screenMaterial(index % 4 === 0 ? '#ffd34f' : '#ff6b55', { depthTest: false, depthWrite: false, opacity: 0.12 }),
        { angleDegrees: (angle * 180) / Math.PI, renderOrder: 37 }
      );
    }
  }

  world.add(group);
};

const addMeasuredSkylineCrispTopPass = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-skyline-crisp-top-pass';
  const materialOptions = { depthTest: false, depthWrite: false };
  const windowLight = screenMaterial('#e9fbff', { ...materialOptions, opacity: 0.08 });
  const warmLight = screenMaterial('#ffe0a0', { ...materialOptions, opacity: 0.065 });
  const darkEdge = screenMaterial('#092038', { ...materialOptions, opacity: 0.07 });
  const roofLight = screenMaterial('#f7fbff', { ...materialOptions, opacity: 0.09 });

  Object.entries(plazaReferenceSpec.skyline.majorTowers).forEach(([id, box], index) => {
    const z = 35 + index * 0.03;
    addScreenRect(
      group,
      { x: box.x + box.width * 0.72, y: box.y + 5, width: Math.max(4, box.width * 0.18), height: box.height - 10 },
      z,
      darkEdge,
      { renderOrder: 41 }
    );
    addScreenRect(
      group,
      { x: box.x + 4, y: box.y + 4, width: Math.max(5, box.width - 8), height: 3 },
      z + 0.02,
      roofLight,
      { renderOrder: 42 }
    );

    const columns = Math.max(2, Math.floor(box.width / 15));
    const rows = Math.max(3, Math.floor(box.height / 24));
    for (let row = 0; row < rows; row += 1) {
      const y = box.y + 18 + row * ((box.height - 34) / Math.max(1, rows - 1));
      if (y > 190) continue;
      for (let col = 0; col < columns; col += 1) {
        if ((row + col + index) % 4 === 0) continue;
        const x = box.x + 8 + col * ((box.width - 18) / Math.max(1, columns - 1));
        addScreenRect(
          group,
          { x, y, width: Math.max(2, box.width * 0.04), height: 3.8 },
          z + 0.04,
          id === 'tallCenter' || index % 3 === 1 ? warmLight : windowLight,
          { renderOrder: 43 }
        );
      }
    }
  });

  const wheel = { x: 236, y: 178, radius: 29 };
  addScreenEllipse(
    group,
    { x: wheel.x - wheel.radius, y: wheel.y - wheel.radius, width: wheel.radius * 2, height: wheel.radius * 2 },
    35.6,
    screenMaterial('#f7fbff', { ...materialOptions, opacity: 0.05 }),
    { renderOrder: 44, segments: 80 }
  );
  for (let index = 0; index < 12; index += 1) {
    const angle = (Math.PI * 2 * index) / 12;
    addMeasuredRoadLine(
      group,
      [
        [wheel.x, wheel.y],
        [wheel.x + Math.cos(angle) * wheel.radius, wheel.y + Math.sin(angle) * wheel.radius],
      ],
      0.8,
      35.62 + index * 0.002,
      '#f7fbff',
      { ...materialOptions, divisions: 4, opacity: 0.035, renderOrder: 44 }
    );
  }

  world.add(group);
};

const createSkylineLayerTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = PLAZA_SCREEN.width;
  canvas.height = PLAZA_SCREEN.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const band = plazaReferenceSpec.skyline.band;
  const colors = ['#2f79ad', '#77b8c9', '#426bab', '#e3aa56', '#895bd4', '#d9f4ff', '#4e95b7', '#d86555'];

  const drawTower = (box, color, alpha = 0.88) => {
    const rgb = hexToRgb(color);
    const gradient = ctx.createLinearGradient(box.x, box.y, box.x + box.width, box.y + box.height);
    gradient.addColorStop(0, rgbString(mixRgb(rgb, { r: 255, g: 255, b: 255 }, 0.26), alpha));
    gradient.addColorStop(0.55, rgbString(rgb, alpha));
    gradient.addColorStop(1, rgbString(mixRgb(rgb, { r: 7, g: 22, b: 34 }, 0.28), alpha));
    ctx.fillStyle = gradient;
    ctx.fillRect(box.x, box.y, box.width, box.height);
    ctx.fillStyle = 'rgba(4, 16, 28, 0.28)';
    ctx.fillRect(box.x + box.width * 0.72, box.y + 4, box.width * 0.28, box.height - 4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.beginPath();
    ctx.moveTo(box.x + 1, box.y + 2);
    ctx.lineTo(box.x + box.width * 0.64, box.y + 2);
    ctx.lineTo(box.x + box.width * 0.42, box.y + box.height * 0.26);
    ctx.lineTo(box.x + 1, box.y + box.height * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(4, 16, 28, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x + 1, box.y + 1, box.width - 2, box.height - 2);
    ctx.fillStyle = 'rgba(247, 251, 255, 0.7)';
    for (let y = box.y + 15; y < box.y + box.height - 8; y += 15) {
      for (let x = box.x + 5; x < box.x + box.width - 5; x += 9) {
        if ((Math.floor(x + y) + box.width) % 4 !== 0) ctx.fillRect(x, y, 3, 5);
      }
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
    ctx.fillRect(box.x + 2, box.y - 4, Math.max(4, box.width - 4), 5);
    ctx.fillStyle = 'rgba(255, 154, 36, 0.32)';
    if (box.width > 22 && box.height < 92) ctx.fillRect(box.x + 3, box.y - 8, box.width - 6, 5);
    if (box.height > 96) {
      ctx.strokeStyle = 'rgba(225, 250, 255, 0.22)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(box.x + box.width * 0.32, box.y + 8);
      ctx.lineTo(box.x + box.width * 0.28, box.y + box.height - 8);
      ctx.moveTo(box.x + box.width * 0.58, box.y + 8);
      ctx.lineTo(box.x + box.width * 0.62, box.y + box.height - 8);
      ctx.stroke();
    }
  };

  for (let index = 0; index < 150; index += 1) {
    const width = 10 + (index % 7) * 5;
    const height = 24 + ((index * 13) % 100) + (index % 17 === 0 ? 42 : 0);
    const x = band.x - 28 + (index % 42) * 24 + (Math.floor(index / 42) % 2) * 8;
    const y = 248 - height + Math.floor(index / 42) * 19;
    if (x + width < 0 || x > PLAZA_SCREEN.width || y < 52 || y > 254) continue;
    if (x > 50 && x < 235 && y < 190) continue;
    drawTower({ x, y, width, height }, colors[index % colors.length], 0.82);
  }

  for (let index = 0; index < 120; index += 1) {
    const row = Math.floor(index / 40);
    const width = 14 + ((index * 11) % 30);
    const height = 18 + ((index * 17) % 58);
    const x = -18 + (index % 40) * 28 + (row % 2) * 11;
    const y = 265 + row * 20 - height;
    if (x + width < 0 || x > PLAZA_SCREEN.width) continue;
    if (x > 42 && x < 236 && y < 190) continue;
    drawTower({ x, y, width, height }, colors[(index + 3) % colors.length], 0.84);
    ctx.fillStyle = index % 3 === 0 ? 'rgba(234, 154, 72, 0.62)' : 'rgba(242, 232, 202, 0.68)';
    ctx.fillRect(x + 2, y - 5, Math.max(6, width - 4), 5);
    if (index % 5 === 0) {
      ctx.fillStyle = 'rgba(7, 18, 28, 0.32)';
      ctx.fillRect(x + width * 0.68, y + 6, width * 0.26, height - 10);
    }
  }

  Object.entries(plazaReferenceSpec.skyline.majorTowers).forEach(([id, box], index) => {
    const style = SKYLINE_MAJOR_TOWER_STYLES[id];
    drawTower(box, style?.front || colors[(index + 2) % colors.length], 0.96);
    if (index % 2 === 0 || id === 'rightWhite') {
      ctx.fillStyle = 'rgba(247, 251, 255, 0.86)';
      ctx.beginPath();
      ctx.moveTo(box.x + box.width / 2, box.y - 22);
      ctx.lineTo(box.x + box.width * 0.12, box.y);
      ctx.lineTo(box.x + box.width * 0.88, box.y);
      ctx.closePath();
      ctx.fill();
    }
  });

  const wheel = { x: 236, y: 178, r: 29 };
  ctx.strokeStyle = 'rgba(247, 251, 255, 0.72)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(wheel.x, wheel.y, wheel.r, wheel.r, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (let index = 0; index < 14; index += 1) {
    const angle = (Math.PI * 2 * index) / 14;
    ctx.beginPath();
    ctx.moveTo(wheel.x, wheel.y);
    ctx.lineTo(wheel.x + Math.cos(angle) * wheel.r, wheel.y + Math.sin(angle) * wheel.r);
    ctx.stroke();
  }
  ['#ef4334', '#2cc8ff', '#ffd34f', '#f7fbff'].forEach((color, colorIndex) => {
    ctx.fillStyle = color;
    for (let index = colorIndex; index < 14; index += 4) {
      const angle = (Math.PI * 2 * index) / 14;
      ctx.save();
      ctx.translate(wheel.x + Math.cos(angle) * wheel.r, wheel.y + Math.sin(angle) * wheel.r);
      ctx.rotate(angle);
      ctx.globalAlpha = 0.68;
      ctx.fillRect(-2.5, -2, 5, 4);
      ctx.restore();
    }
  });

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(208, 132, 72, 0.24)';
  ctx.fillRect(band.x - 32, 48, band.width + 64, 214);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const createSkylineDepthLayerTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = PLAZA_SCREEN.width;
  canvas.height = PLAZA_SCREEN.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const rect = (box, fillStyle) => {
    ctx.fillStyle = fillStyle;
    ctx.fillRect(box.x, box.y, box.width, box.height);
  };

  const poly = (points, fillStyle) => {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };

  const drawTower = (id, box, style) => {
    const rgb = hexToRgb(style.front);
    ctx.save();
    ctx.shadowColor = 'rgba(3, 10, 18, 0.22)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 5;
    rect({ x: box.x + 3, y: box.y + 4, width: box.width, height: box.height }, 'rgba(3, 10, 18, 0.2)');
    ctx.restore();

    const gradient = ctx.createLinearGradient(box.x, box.y, box.x + box.width, box.y + box.height);
    gradient.addColorStop(0, rgbString(mixRgb(rgb, { r: 255, g: 255, b: 255 }, 0.2), 0.94));
    gradient.addColorStop(0.62, rgbString(rgb, 0.94));
    gradient.addColorStop(1, rgbString(mixRgb(rgb, { r: 5, g: 15, b: 25 }, 0.36), 0.94));
    rect(box, gradient);
    rect({ x: box.x + box.width * 0.68, y: box.y + 5, width: box.width * 0.32, height: box.height - 5 }, rgbString(hexToRgb(style.side), 0.82));
    rect({ x: box.x + 2, y: box.y + 2, width: Math.max(4, box.width * 0.52), height: 4 }, 'rgba(247, 251, 255, 0.46)');

    if (id === 'rightWhite' || id === 'leftSpire' || id === 'centerNeedle' || id === 'tallCenter') {
      poly(
        [
          [box.x + box.width * 0.5, box.y - Math.min(26, box.height * 0.18)],
          [box.x + box.width * 0.12, box.y],
          [box.x + box.width * 0.88, box.y],
        ],
        rgbString(hexToRgb(style.top), id === 'rightWhite' ? 0.88 : 0.74)
      );
    } else {
      rect({ x: box.x + 3, y: box.y - 5, width: Math.max(5, box.width - 6), height: 6 }, rgbString(hexToRgb(style.top), 0.78));
    }

    ctx.strokeStyle = 'rgba(3, 10, 18, 0.32)';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x + 1, box.y + 1, box.width - 2, box.height - 2);

    ctx.fillStyle = id === 'rightWhite' ? 'rgba(121, 167, 184, 0.44)' : 'rgba(222, 250, 255, 0.58)';
    const colStep = Math.max(8, box.width / 4.5);
    const rowStep = id === 'rightWhite' ? 17 : 15;
    for (let y = box.y + 18; y < box.y + box.height - 10; y += rowStep) {
      for (let x = box.x + 6; x < box.x + box.width - 6; x += colStep) {
        if ((Math.floor(x + y + box.width) % 5) === 0) continue;
        ctx.fillRect(x, y, Math.max(2.5, colStep * 0.24), id === 'rightWhite' ? 6 : 5);
      }
    }
  };

  const band = plazaReferenceSpec.skyline.band;
  const palette = ['#286986', '#75aabd', '#315a8d', '#d48a45', '#7f5ac4', '#d9f1f5', '#4f88a8', '#c85f50'];
  for (let index = 0; index < 58; index += 1) {
    const row = Math.floor(index / 29);
    const width = 14 + ((index * 7) % 25);
    const height = 24 + ((index * 11) % 74);
    const x = band.x - 18 + (index % 29) * 28 + row * 8;
    const y = 252 + row * 18 - height;
    if (x + width < 0 || x > PLAZA_SCREEN.width || y < 72 || y > 260) continue;
    if (x > 42 && x < 240 && y < 190) continue;
    const color = palette[index % palette.length];
    drawTower(`small-${index}`, { x, y, width, height }, { front: color, side: '#284457', top: index % 3 ? '#f0d599' : '#dff8ff' });
  }

  Object.entries(plazaReferenceSpec.skyline.majorTowers).forEach(([id, box]) => {
    drawTower(id, box, SKYLINE_MAJOR_TOWER_STYLES[id]);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const createLightingOverlayTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = PLAZA_SCREEN.width;
  canvas.height = PLAZA_SCREEN.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const drawSoftEllipse = (box, color, blur = 18) => {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(box.x + box.width / 2, box.y + box.height / 2, box.width / 2, box.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  DISTRICT_ORDER.forEach((key) => {
    const full = plazaReferenceSpec.landmarks[key].full;
    const bottom = full.y + full.height;
    ctx.fillStyle = 'rgba(3, 10, 18, 0.1)';
    ctx.beginPath();
    ctx.moveTo(full.x + full.width * 0.12, bottom - 18);
    ctx.lineTo(full.x + full.width * 0.92, bottom - 16);
    ctx.lineTo(full.x + full.width * 1.05, bottom + 20);
    ctx.lineTo(full.x + full.width * 0.24, bottom + 26);
    ctx.closePath();
    ctx.fill();
    drawSoftEllipse(
      { x: full.x + full.width * 0.08, y: bottom - 30, width: full.width * 0.88, height: 42 },
      'rgba(3, 10, 18, 0.12)',
      12
    );
  });

  let gradient = ctx.createRadialGradient(230, 80, 20, 230, 80, 520);
  gradient.addColorStop(0, 'rgba(255, 246, 190, 0.2)');
  gradient.addColorStop(0.42, 'rgba(255, 212, 110, 0.08)');
  gradient.addColorStop(1, 'rgba(255, 212, 110, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  gradient = ctx.createLinearGradient(0, 150, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(0.42, 'rgba(8, 18, 30, 0.1)');
  gradient.addColorStop(0.72, 'rgba(8, 18, 30, 0.2)');
  gradient.addColorStop(1, 'rgba(8, 18, 30, 0.34)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  gradient = ctx.createLinearGradient(0, 174, 0, 354);
  gradient.addColorStop(0, 'rgba(6, 14, 24, 0)');
  gradient.addColorStop(0.55, 'rgba(6, 14, 24, 0.12)');
  gradient.addColorStop(1, 'rgba(6, 14, 24, 0.08)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 174, canvas.width, 180);

  drawSoftEllipse(plazaReferenceSpec.roundabout.outerEllipse, 'rgba(3, 10, 18, 0.08)', 18);

  gradient = ctx.createRadialGradient(604, 398, 20, 604, 398, 190);
  gradient.addColorStop(0, 'rgba(70, 217, 239, 0.045)');
  gradient.addColorStop(0.42, 'rgba(70, 217, 239, 0.018)');
  gradient.addColorStop(1, 'rgba(70, 217, 239, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  gradient = ctx.createRadialGradient(PLAZA_SCREEN.width / 2, PLAZA_SCREEN.height * 0.58, 260, PLAZA_SCREEN.width / 2, PLAZA_SCREEN.height * 0.58, 650);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.74, 'rgba(0, 0, 0, 0.04)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
  gradient.addColorStop(0.34, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(1, 'rgba(2, 8, 15, 0.08)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  gradient = ctx.createLinearGradient(0, 330, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(178, 112, 58, 0)');
  gradient.addColorStop(0.5, 'rgba(178, 112, 58, 0.055)');
  gradient.addColorStop(1, 'rgba(178, 112, 58, 0.12)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 330, canvas.width, canvas.height - 330);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const createLowerSkylineCorrectionTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = PLAZA_SCREEN.width;
  canvas.height = PLAZA_SCREEN.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let gradient = ctx.createLinearGradient(0, 138, 0, 292);
  gradient.addColorStop(0, 'rgba(36, 108, 208, 0)');
  gradient.addColorStop(0.2, 'rgba(36, 108, 208, 0.32)');
  gradient.addColorStop(0.64, 'rgba(36, 108, 208, 0.48)');
  gradient.addColorStop(1, 'rgba(36, 108, 208, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(244, 138, 814, 154);

  gradient = ctx.createLinearGradient(244, 170, 1058, 250);
  gradient.addColorStop(0, 'rgba(16, 44, 90, 0.08)');
  gradient.addColorStop(0.45, 'rgba(80, 126, 192, 0.12)');
  gradient.addColorStop(1, 'rgba(16, 44, 90, 0.1)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(244, 176);
  ctx.lineTo(340, 166);
  ctx.lineTo(448, 178);
  ctx.lineTo(558, 166);
  ctx.lineTo(680, 180);
  ctx.lineTo(806, 164);
  ctx.lineTo(940, 176);
  ctx.lineTo(1058, 162);
  ctx.lineTo(1058, 270);
  ctx.lineTo(244, 270);
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const createPlazaInkLayerTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = PLAZA_SCREEN.width;
  canvas.height = PLAZA_SCREEN.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const path = (points, color, width, dash = []) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.restore();
  };

  const strokeEllipse = (box, color, width, dash = []) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.ellipse(box.x + box.width / 2, box.y + box.height / 2, box.width / 2, box.height / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  const strokeRect = (box, color, width) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
  };

  const fillPoly = (points, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };

  const roadById = Object.fromEntries(plazaReferenceSpec.roads.map((road) => [road.id, road]));
  ['midArc', 'foregroundArc', 'rightFeeder', 'leftFeeder', 'bridgeApproach'].forEach((id) => {
    const road = roadById[id];
    if (!road) return;
    path(road.polyline, 'rgba(3, 10, 18, 0.38)', id === 'foregroundArc' ? 6 : 4);
    path(road.polyline, 'rgba(247, 251, 255, 0.6)', id === 'foregroundArc' ? 3.6 : 2.8, [26, 22]);
    path(road.polyline, 'rgba(255, 195, 54, 0.66)', id === 'foregroundArc' ? 3.2 : 2.4, [18, 30]);
  });
  if (roadById.backbone) {
    path(roadById.backbone.polyline, 'rgba(3, 10, 18, 0.32)', 5);
    path(roadById.backbone.polyline, 'rgba(247, 251, 255, 0.56)', 2.6, [20, 18]);
  }

  const outer = plazaReferenceSpec.roundabout.outerEllipse;
  const island = plazaReferenceSpec.roundabout.innerIsland;
  strokeEllipse(outer, 'rgba(3, 10, 18, 0.42)', 4);
  strokeEllipse({ x: outer.x + 23, y: outer.y + 16, width: outer.width - 46, height: outer.height - 32 }, 'rgba(247, 251, 255, 0.56)', 3.4, [28, 18]);
  strokeEllipse({ x: outer.x + 28, y: outer.y + 20, width: outer.width - 56, height: outer.height - 40 }, 'rgba(255, 196, 56, 0.52)', 2.8, [16, 18]);
  strokeEllipse(island, 'rgba(3, 10, 18, 0.4)', 3.2);
  plazaReferenceSpec.roundabout.ringMarkings.forEach((box, index) => {
    strokeEllipse(box, index === 0 ? 'rgba(247, 251, 255, 0.54)' : 'rgba(82, 227, 255, 0.52)', index === 0 ? 2.8 : 2.2);
  });

  plazaReferenceSpec.crosswalks.forEach((crosswalk) => {
    ctx.save();
    ctx.translate(crosswalk.box.x + crosswalk.box.width / 2, crosswalk.box.y + crosswalk.box.height / 2);
    ctx.rotate((crosswalk.angleDegrees * Math.PI) / 180);
    ctx.fillStyle = 'rgba(247, 251, 255, 0.72)';
    const stripes = Math.max(5, Math.floor(crosswalk.box.width / 10));
    for (let index = 0; index < stripes; index += 1) {
      const x = -crosswalk.box.width / 2 + index * (crosswalk.box.width / stripes);
      ctx.fillRect(x, -crosswalk.box.height * 0.34, crosswalk.box.width / (stripes * 2), crosswalk.box.height * 0.68);
    }
    ctx.restore();
  });

  path([[0, 416], [224, 385], [463, 432]], 'rgba(247, 251, 255, 0.72)', 4.4);
  path([[0, 433], [216, 402], [452, 447]], 'rgba(239, 157, 92, 0.72)', 3.4);
  path([[0, 462], [128, 441], [205, 522]], 'rgba(82, 227, 255, 0.58)', 3.2);
  path([[0, 491], [169, 462], [232, 522]], 'rgba(247, 251, 255, 0.36)', 2.4);
  fillPoly([[0, 433], [224, 386], [462, 433], [456, 442], [222, 399], [0, 438]], 'rgba(3, 10, 18, 0.16)');

  DISTRICT_ORDER.forEach((key) => {
    const target = plazaReferenceSpec.landmarks[key];
    const style = DISTRICT_SCREEN_DATA[key];
    const { body, full, roof, sign, portal } = target;
    fillPoly(
      [
        [full.x + full.width * 0.1, full.y + full.height - 28],
        [full.x + full.width * 0.95, full.y + full.height - 23],
        [full.x + full.width * 1.04, full.y + full.height + 10],
        [full.x + full.width * 0.22, full.y + full.height + 20],
      ],
      'rgba(3, 10, 18, 0.2)'
    );
    strokeRect(body, 'rgba(3, 10, 18, 0.5)', 2.8);
    strokeRect(sign, 'rgba(3, 10, 18, 0.72)', 2.4);
    strokeRect(sign, style.accent, 1.4);
    path(
      [
        [roof.x + 3, roof.y + roof.height - 2],
        [roof.x + roof.width - 4, roof.y + roof.height - 2],
      ],
      'rgba(3, 10, 18, 0.58)',
      3
    );
    path(
      [
        [body.x + body.width * 0.18, body.y + 8],
        [body.x + body.width * 0.16, body.y + body.height - 12],
      ],
      'rgba(247, 251, 255, 0.24)',
      2
    );
    path(
      [
        [body.x + body.width * 0.72, body.y + 10],
        [body.x + body.width * 0.77, body.y + body.height - 13],
      ],
      'rgba(3, 10, 18, 0.34)',
      2.4
    );
    strokeEllipse(
      {
        x: portal.x - portal.width * 0.13,
        y: portal.y - portal.height * 0.08,
        width: portal.width * 1.26,
        height: portal.height * 1.08,
      },
      style.accent,
      3.4
    );
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const createForegroundDepthLayerTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = PLAZA_SCREEN.width;
  canvas.height = PLAZA_SCREEN.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const poly = (points, fillStyle) => {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };

  const path = (points, color, width, dash = []) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.restore();
  };

  const ellipse = (box, fillStyle, strokeStyle = null, lineWidth = 1) => {
    ctx.beginPath();
    ctx.ellipse(box.x + box.width / 2, box.y + box.height / 2, box.width / 2, box.height / 2, 0, 0, Math.PI * 2);
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  };

  const gradient = ctx.createLinearGradient(0, 360, 0, PLAZA_SCREEN.height);
  gradient.addColorStop(0, 'rgba(38, 47, 55, 0)');
  gradient.addColorStop(0.34, 'rgba(28, 36, 43, 0.28)');
  gradient.addColorStop(1, 'rgba(12, 18, 24, 0.34)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 330, PLAZA_SCREEN.width, PLAZA_SCREEN.height - 330);

  poly([[0, 438], [198, 405], [455, 450], [504, 522], [0, 522]], 'rgba(80, 91, 100, 0.72)');
  poly([[0, 462], [176, 429], [236, 522], [0, 522]], 'rgba(4, 92, 128, 0.72)');
  poly([[0, 492], [170, 460], [230, 522], [0, 522]], 'rgba(5, 64, 98, 0.64)');
  path([[0, 456], [128, 436], [205, 522]], 'rgba(72, 228, 255, 0.62)', 4);
  path([[0, 490], [166, 463], [232, 522]], 'rgba(237, 252, 255, 0.42)', 2.8);

  poly([[604, 430], [760, 421], [930, 437], [1058, 466], [1058, 522], [618, 522], [535, 462]], 'rgba(34, 42, 49, 0.7)');
  poly([[780, 455], [948, 463], [1058, 492], [1058, 522], [760, 522], [650, 486]], 'rgba(20, 27, 34, 0.58)');
  poly([[552, 462], [708, 447], [872, 475], [962, 522], [600, 522]], 'rgba(83, 93, 101, 0.44)');
  poly([[848, 486], [982, 495], [1058, 510], [1058, 522], [912, 522]], 'rgba(92, 144, 61, 0.35)');

  const outer = plazaReferenceSpec.roundabout.outerEllipse;
  ellipse({ x: outer.x - 5, y: outer.y + 5, width: outer.width + 10, height: outer.height + 15 }, 'rgba(5, 12, 20, 0.22)');
  ellipse(outer, 'rgba(209, 199, 184, 0.52)', 'rgba(247, 251, 255, 0.35)', 2.4);
  ellipse({ x: outer.x + 25, y: outer.y + 17, width: outer.width - 50, height: outer.height - 34 }, 'rgba(32, 40, 48, 0.7)');
  ellipse(plazaReferenceSpec.roundabout.innerIsland, 'rgba(195, 196, 185, 0.48)', 'rgba(247, 251, 255, 0.35)', 2);

  [
    [[0, 416], [224, 385], [462, 432]],
    [[0, 435], [216, 402], [452, 448]],
    [[603, 430], [760, 423], [922, 438], [1058, 466]],
  ].forEach((points, index) => {
    path(points, index === 1 ? 'rgba(237, 156, 91, 0.7)' : 'rgba(247, 251, 255, 0.62)', index === 1 ? 3.2 : 4.4);
  });

  [
    [690, 448, 58, -6],
    [762, 446, 58, -2],
    [835, 452, 60, 5],
    [916, 466, 56, 8],
    [996, 486, 54, 11],
    [78, 445, 44, -13],
    [142, 431, 44, -11],
    [210, 420, 46, -8],
    [282, 414, 46, -4],
  ].forEach(([x, y, width, angle]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.fillStyle = 'rgba(255, 200, 54, 0.72)';
    ctx.fillRect(-width / 2, -1.5, width, 3);
    ctx.restore();
  });

  [
    [18, 423, -9, 0.78],
    [54, 418, -9, 0.72],
    [92, 412, -8, 0.68],
    [132, 407, -8, 0.62],
    [174, 401, -7, 0.58],
    [218, 397, -5, 0.54],
  ].forEach(([x, y, angle, scale]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.fillStyle = 'rgba(247, 251, 255, 0.82)';
    ctx.fillRect(-2 * scale, -14 * scale, 4 * scale, 19 * scale);
    ctx.fillStyle = 'rgba(239, 157, 92, 0.82)';
    ctx.fillRect(-7 * scale, -16 * scale, 14 * scale, 3.4 * scale);
    ctx.restore();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const createForegroundReferenceAtlasTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = PLAZA_SCREEN.width;
  canvas.height = PLAZA_SCREEN.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const poly = (points, fillStyle) => {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };

  const path = (points, strokeStyle, width, dash = []) => {
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.restore();
  };

  const ellipse = (box, fillStyle, strokeStyle = null, lineWidth = 1, dash = []) => {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(box.x + box.width / 2, box.y + box.height / 2, box.width / 2, box.height / 2, 0, 0, Math.PI * 2);
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash(dash);
      ctx.stroke();
    }
    ctx.restore();
  };

  const rect = (box, fillStyle, angleDegrees = 0) => {
    ctx.save();
    ctx.translate(box.x + box.width / 2, box.y + box.height / 2);
    ctx.rotate((angleDegrees * Math.PI) / 180);
    ctx.fillStyle = fillStyle;
    ctx.fillRect(-box.width / 2, -box.height / 2, box.width, box.height);
    ctx.restore();
  };

  const roadById = Object.fromEntries(plazaReferenceSpec.roads.map((road) => [road.id, road]));
  const foreground = roadById.foregroundArc?.polyline;
  const midArc = roadById.midArc?.polyline;
  const bridge = roadById.bridgeApproach?.polyline;
  const backbone = roadById.backbone?.polyline;
  const leftFeeder = roadById.leftFeeder?.polyline;
  const rightFeeder = roadById.rightFeeder?.polyline;

  poly(plazaReferenceSpec.water.polygon, 'rgba(0, 131, 174, 0.9)');
  poly([[0, 461], [132, 438], [214, 522], [0, 522]], 'rgba(0, 92, 135, 0.5)');
  path([[0, 452], [138, 430], [202, 522]], 'rgba(92, 233, 255, 0.58)', 4.2);
  path([[0, 487], [170, 459], [228, 522]], 'rgba(247, 251, 255, 0.3)', 2.8);

  poly(plazaReferenceSpec.bridge.deckPolygon, 'rgba(120, 132, 143, 0.84)');
  poly([[0, 421], [224, 386], [462, 433], [452, 446], [218, 402], [0, 438]], 'rgba(40, 49, 58, 0.88)');
  poly(plazaReferenceSpec.bridge.railPolygon, 'rgba(241, 242, 228, 0.86)');
  poly([[0, 448], [206, 413], [438, 459], [492, 522], [0, 522]], 'rgba(82, 94, 106, 0.52)');
  path([[0, 416], [224, 385], [462, 432]], 'rgba(247, 251, 255, 0.94)', 4.6);
  path([[0, 435], [218, 402], [452, 447]], 'rgba(235, 149, 86, 0.78)', 3.4);
  for (let index = 0; index < 9; index += 1) {
    const x = 20 + index * 38;
    const y = 424 - index * 3.8 + Math.max(0, index - 5) * 6;
    rect({ x: x - 2, y: y - 14, width: 4, height: 18 }, 'rgba(247, 251, 255, 0.86)', -9 + index * 1.5);
    rect({ x: x - 7, y: y - 16, width: 14, height: 3.4 }, 'rgba(235, 149, 86, 0.82)', -9 + index * 1.5);
  }

  if (midArc) {
    path(midArc, 'rgba(238, 231, 214, 0.78)', 68);
    path(midArc, 'rgba(47, 56, 65, 0.96)', 50);
    path(midArc, 'rgba(247, 251, 255, 0.66)', 4, [26, 22]);
    path(midArc, 'rgba(255, 207, 61, 0.68)', 3, [18, 30]);
  }
  if (foreground) {
    path(foreground, 'rgba(238, 231, 214, 0.82)', 92);
    path(foreground, 'rgba(43, 52, 60, 0.98)', 70);
    path(foreground, 'rgba(247, 251, 255, 0.74)', 4.8);
    path(foreground, 'rgba(255, 207, 61, 0.76)', 3.4, [46, 30]);
  }
  if (bridge) {
    path(bridge, 'rgba(238, 231, 214, 0.72)', 54);
    path(bridge, 'rgba(44, 53, 62, 0.9)', 34);
    path(bridge, 'rgba(247, 251, 255, 0.72)', 3.2, [22, 18]);
  }
  [leftFeeder, rightFeeder].filter(Boolean).forEach((points, index) => {
    path(points, 'rgba(238, 231, 214, 0.68)', 52);
    path(points, 'rgba(45, 54, 63, 0.88)', 34);
    path(points, index ? 'rgba(247, 251, 255, 0.6)' : 'rgba(255, 207, 61, 0.6)', 2.8, [18, 22]);
  });
  if (backbone) {
    path(backbone, 'rgba(238, 231, 214, 0.54)', 48);
    path(backbone, 'rgba(39, 48, 57, 0.76)', 30);
    path(backbone, 'rgba(247, 251, 255, 0.62)', 2.8, [18, 18]);
  }

  const outer = plazaReferenceSpec.roundabout.outerEllipse;
  const island = plazaReferenceSpec.roundabout.innerIsland;
  ellipse({ x: outer.x - 8, y: outer.y + 8, width: outer.width + 16, height: outer.height + 18 }, 'rgba(4, 11, 18, 0.26)');
  ellipse(outer, 'rgba(226, 218, 204, 0.82)', 'rgba(247, 251, 255, 0.5)', 2.8);
  ellipse({ x: outer.x + 24, y: outer.y + 16, width: outer.width - 48, height: outer.height - 32 }, 'rgba(46, 56, 64, 0.96)');
  ellipse(island, 'rgba(210, 207, 192, 0.86)', 'rgba(247, 251, 255, 0.46)', 2.2);
  plazaReferenceSpec.roundabout.ringMarkings.forEach((box, index) => {
    ellipse(
      box,
      null,
      index === 0 ? 'rgba(247, 251, 255, 0.68)' : 'rgba(70, 217, 239, 0.52)',
      index === 0 ? 3 : 2,
      index === 0 ? [28, 18] : []
    );
  });

  plazaReferenceSpec.crosswalks.forEach((crosswalk) => {
    const stripeCount = Math.max(5, Math.floor(crosswalk.box.width / 12));
    for (let index = 0; index < stripeCount; index += 1) {
      const width = crosswalk.box.width / (stripeCount * 1.75);
      rect(
        {
          x: crosswalk.box.x + index * (crosswalk.box.width / stripeCount),
          y: crosswalk.box.y + crosswalk.box.height * 0.12,
          width,
          height: crosswalk.box.height * 0.76,
        },
        'rgba(247, 251, 255, 0.86)',
        crosswalk.angleDegrees
      );
    }
  });

  [
    [336, 399, 38, -8],
    [386, 407, 40, -8],
    [508, 452, 34, 9],
    [618, 462, 48, -3],
    [700, 448, 58, -6],
    [764, 446, 58, -2],
    [836, 452, 60, 5],
    [918, 466, 56, 8],
    [998, 486, 52, 11],
    [80, 445, 44, -13],
    [144, 431, 44, -11],
    [212, 420, 46, -8],
    [282, 414, 46, -4],
  ].forEach(([x, y, width, angle]) => {
    rect({ x: x - width / 2, y: y - 1.5, width, height: 3 }, 'rgba(255, 207, 61, 0.78)', angle);
  });

  [
    [[876, 478], [905, 469], [900, 489]],
    [[942, 492], [974, 484], [964, 504]],
    [[406, 420], [432, 414], [426, 431]],
    [[230, 462], [260, 455], [252, 474]],
  ].forEach((points) => poly(points, 'rgba(255, 207, 61, 0.72)'));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const DISTRICT_SCREEN_DATA = {
  gym: { accent: '#68ff4f', base: '#43af57', dark: '#1c5c35', icon: 'dumbbell', roof: '#e9f6c8', sign: 'GYM' },
  food: { accent: '#ff9a24', base: '#ef8129', dark: '#994113', icon: 'utensils', roof: '#ffec9f', sign: 'FOOD COURT' },
  lab: { accent: '#d95cff', base: '#884fe2', dark: '#3b2078', icon: 'flask', roof: '#efddff', sign: 'LAB' },
  clinic: { accent: '#ff5263', base: '#e44949', dark: '#7c1f2b', icon: 'cross', roof: '#f4efe8', sign: 'CLINIC' },
  garage: { accent: '#25bfff', base: '#2778d8', dark: '#123c78', icon: 'wrench', roof: '#e5f8ff', sign: 'GARAGE' },
};

const DISTRICT_BODY_GLAZE = {
  gym: { color: '#5a5f37', opacity: 0.34 },
  food: { color: '#6b4c29', opacity: 0.38 },
  lab: { color: '#4e4478', opacity: 0.36 },
  clinic: { color: '#876461', opacity: 0.46 },
  garage: { color: '#4a6173', opacity: 0.44 },
};

const DISTRICT_PORTAL_OPACITY = {
  food: 0.9,
  garage: 0.92,
  gym: 0.82,
};

const DISTRICT_BODY_COLOR_CORRECTION = {
  clinic: { color: '#e5c699', opacity: 0.18 },
  garage: { color: '#718c99', opacity: 0.18 },
  gym: { color: '#b88145', opacity: 0.26 },
  lab: { color: '#8c6bae', opacity: 0.14 },
};

const DISTRICT_BODY_LIGHT_CORRECTION = {
  garage: { color: '#74c9ff', opacity: 0.08 },
  gym: { color: '#a4d96c', opacity: 0.78 },
};

const DISTRICT_BODY_BALANCE_CORRECTION = {
  clinic: { color: '#876252', opacity: 0.58 },
  food: { color: '#825e26', opacity: 0.55 },
  garage: { color: '#395879', opacity: 0.5 },
  lab: { color: '#544b89', opacity: 0.62 },
};

const DISTRICT_ROOF_BALANCE_CORRECTION = {
  clinic: { color: '#b95354', opacity: 0.38 },
  food: { color: '#956549', opacity: 0.4 },
  garage: { color: '#576563', opacity: 0.45 },
  gym: { color: '#708579', opacity: 0.4 },
  lab: { color: '#515a74', opacity: 0.45 },
};

const DISTRICT_SIGN_COLOR_CORRECTION = {
  clinic: { color: '#ff7545', opacity: 0.4 },
  food: { color: '#8c2100', opacity: 0.4 },
  garage: { color: '#002469', opacity: 0.4 },
  gym: { color: '#c97277', opacity: 0.32 },
  lab: { color: '#2d13cf', opacity: 0.32 },
};

const DISTRICT_ROOF_COLOR_CORRECTION = {
  clinic: { color: '#b62230', opacity: 0.3 },
  food: { color: '#7a220d', opacity: 0.48 },
  garage: { color: '#475259', opacity: 0.38 },
  gym: { color: '#39565a', opacity: 0.46 },
  lab: { color: '#242b52', opacity: 0.48 },
};

const DISTRICT_PORTAL_COLOR_CORRECTION = {
  clinic: { color: '#ff8998', opacity: 0.5 },
  food: { color: '#ff9a24', opacity: 0.44 },
  gym: { color: '#68ff4f', opacity: 0.16 },
  lab: { color: '#b56cff', opacity: 0.38 },
};

const DISTRICT_SIGN_LIGHT_CORRECTION = {
  clinic: { color: '#fff0ed', opacity: 0.06 },
  food: { color: '#f4dfbd', opacity: 0.045 },
  garage: { color: '#d7f0ff', opacity: 0.06 },
  gym: { color: '#eef7d8', opacity: 0.06 },
  lab: { color: '#e3d7ff', opacity: 0.05 },
};

const DISTRICT_FINAL_FACADE_DECAL_OPACITY = {
  clinic: 0.72,
  food: 0.72,
  garage: 0.72,
  gym: 0.72,
  lab: 0.72,
};

const createDistrictSignTexture = (key, style, box = null) => {
  const textureHeight = box ? Math.max(128, Math.round(box.height * 8)) : 160;
  const textureWidth = box ? Math.max(256, Math.round(box.width * 8)) : 512;
  const fontSize = Math.round(textureHeight * (key === 'food' ? 0.5 : 0.64));
  return createLabelTexture(style.sign, style.accent, {
    background: style.dark,
    font: `900 ${fontSize}px Impact, Arial Black, sans-serif`,
    height: textureHeight,
    strokeWidth: Math.max(7, Math.round(textureHeight * 0.045)),
    width: textureWidth,
  });
};

const addMeasuredWindows = (group, body, z, accent, columns = 4, rows = 4) => {
  const glassMat = screenMaterial('#dcfbff', { opacity: 0.92 });
  const glowMat = screenMaterial(accent, { opacity: 0.5 });
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      if ((row + col) % 5 === 0) continue;
      const width = Math.max(4, body.width * 0.055);
      const height = Math.max(5, body.height * 0.07);
      const x = body.x + body.width * (0.18 + (col * 0.64) / Math.max(1, columns - 1)) - width / 2;
      const y = body.y + body.height * (0.17 + (row * 0.48) / Math.max(1, rows - 1));
      addScreenRect(group, { x, y, width, height }, z + 0.4, glassMat);
      if ((row + col) % 3 === 0) addScreenRect(group, { x, y, width, height: 1.5 }, z + 0.5, glowMat);
    }
  }
};

const addDistrictFacadeModule = (group, box, z, style, options = {}) => {
  const baseRgb = hexToRgb(style.base);
  const front = options.front || rgbString(mixRgb(baseRgb, { r: 255, g: 255, b: 255 }, options.lighten ?? 0.06));
  const side = options.side || style.dark;
  addScreenBox3D(
    group,
    box,
    z,
    options.depth || 20,
    {
      front,
      side,
      top: options.top || style.roof,
    },
    {
      opacity: options.opacity ?? 0.96,
      pitchDegrees: options.pitchDegrees ?? -3,
      yawDegrees: options.yawDegrees ?? 0,
    }
  );
  addScreenRect(
    group,
    { x: box.x + 3, y: box.y + 3, width: Math.max(4, box.width - 6), height: Math.max(4, box.height - 6) },
    z + 10.5,
    textureMaterial(createPanelTexture(front, side, style.accent), { opacity: options.textureOpacity ?? 0.38 })
  );
  addScreenRect(group, { x: box.x + box.width * 0.08, y: box.y + 6, width: box.width * 0.84, height: 4 }, z + 11, screenMaterial('#f7fbff', { opacity: 0.22 }));
  addMeasuredWindows(group, box, z + 11.2, style.accent, options.columns || 3, options.rows || 3);
};

const addDistrictRoofCap = (group, box, z, style, options = {}) => {
  addScreenPolygon(
    group,
    [
      [box.x, box.y + box.height],
      [box.x + box.width * (options.leftPeak ?? 0.16), box.y + 1],
      [box.x + box.width * (options.rightPeak ?? 0.86), box.y],
      [box.x + box.width, box.y + box.height],
    ],
    z,
    screenMaterial(options.color || style.roof, { opacity: options.opacity ?? 0.96 })
  );
  addScreenPolygon(
    group,
    [
      [box.x + box.width * 0.72, box.y + 2],
      [box.x + box.width, box.y + box.height],
      [box.x + box.width * 0.86, box.y + box.height + 6],
      [box.x + box.width * 0.62, box.y + 7],
    ],
    z + 0.4,
    screenMaterial(style.dark, { opacity: options.sideOpacity ?? 0.24 })
  );
};

const addMeasuredDistrictMassing = (group, key, target, style, z) => {
  const { body, full, portal, roof } = target;
  const yaw = { clinic: -8, food: 4, garage: -10, gym: 8, lab: 0 }[key] || 0;
  const moduleZ = z + 7;

  if (key === 'gym') {
    addDistrictFacadeModule(group, { x: body.x + 34, y: body.y + 7, width: body.width * 0.56, height: body.height * 0.88 }, moduleZ, style, {
      columns: 3,
      depth: 24,
      rows: 4,
      yawDegrees: yaw,
    });
    addDistrictFacadeModule(group, { x: full.x + 9, y: body.y + 28, width: 42, height: body.height * 0.73 }, moduleZ - 1, style, {
      columns: 1,
      front: '#65717a',
      rows: 3,
      side: '#38434c',
      textureOpacity: 0.22,
      yawDegrees: yaw,
    });
    addDistrictFacadeModule(group, { x: body.x + body.width - 43, y: body.y + 36, width: 40, height: body.height * 0.44 }, moduleZ + 1, style, {
      columns: 1,
      rows: 2,
      yawDegrees: yaw,
    });
    addDistrictRoofCap(group, { x: full.x + 13, y: roof.y + 4, width: roof.width * 0.52, height: roof.height * 0.58 }, z + 19, style);
    addDistrictRoofCap(group, { x: body.x + 39, y: roof.y + 6, width: roof.width * 0.68, height: roof.height * 0.52 }, z + 19.4, style, {
      sideOpacity: 0.3,
    });
  } else if (key === 'food') {
    addDistrictFacadeModule(group, { x: body.x + 5, y: body.y + 12, width: body.width * 0.66, height: body.height * 0.86 }, moduleZ, style, {
      columns: 4,
      rows: 4,
      yawDegrees: yaw,
    });
    addDistrictFacadeModule(group, { x: body.x + body.width * 0.66, y: body.y + 19, width: body.width * 0.3, height: body.height * 0.71 }, moduleZ + 0.5, style, {
      columns: 2,
      rows: 3,
      side: '#75300f',
      yawDegrees: yaw,
    });
    addDistrictRoofCap(group, { x: roof.x + 6, y: roof.y + 6, width: roof.width * 0.68, height: roof.height * 0.5 }, z + 19, style, { color: '#ffe2a0' });
    [0.18, 0.5, 0.82].forEach((portion, index) => {
      addScreenRect(
        group,
        { x: body.x + body.width * portion - 24, y: body.y + 3 + index * 1.5, width: 48, height: 10 },
        z + 20 + index * 0.2,
        screenMaterial(index === 1 ? '#ffe2a0' : style.accent, { opacity: 0.94 })
      );
    });
  } else if (key === 'lab') {
    addDistrictFacadeModule(group, { x: body.x + 16, y: body.y + 4, width: body.width * 0.72, height: body.height * 0.96 }, moduleZ, style, {
      columns: 3,
      depth: 24,
      rows: 5,
      yawDegrees: yaw,
    });
    addDistrictFacadeModule(group, { x: body.x - 2, y: body.y + 34, width: 22, height: body.height * 0.62 }, moduleZ - 0.4, style, {
      columns: 1,
      rows: 3,
      side: '#26114d',
      yawDegrees: yaw,
    });
    addDistrictFacadeModule(group, { x: body.x + body.width - 18, y: body.y + 29, width: 22, height: body.height * 0.66 }, moduleZ - 0.2, style, {
      columns: 1,
      rows: 3,
      side: '#26114d',
      yawDegrees: yaw,
    });
    addScreenRect(group, { x: body.x + body.width * 0.26, y: body.y - 28, width: body.width * 0.5, height: 23 }, z + 19, screenMaterial(style.dark, { opacity: 0.96 }));
    addDistrictRoofCap(group, { x: roof.x + 4, y: roof.y + 2, width: roof.width * 0.88, height: roof.height * 0.56 }, z + 20, style);
  } else if (key === 'clinic') {
    addDistrictFacadeModule(group, { x: body.x + 11, y: body.y + 9, width: body.width * 0.68, height: body.height * 0.9 }, moduleZ, style, {
      columns: 3,
      rows: 4,
      yawDegrees: yaw,
    });
    addDistrictFacadeModule(group, { x: body.x + body.width * 0.68, y: body.y + 19, width: body.width * 0.28, height: body.height * 0.72 }, moduleZ + 0.5, style, {
      columns: 1,
      rows: 3,
      side: '#631720',
      yawDegrees: yaw,
    });
    addDistrictRoofCap(group, { x: roof.x - 3, y: roof.y + 3, width: roof.width * 1.06, height: roof.height * 0.56 }, z + 19, style, {
      color: '#fff8ee',
    });
    addScreenRect(group, { x: body.x + body.width * 0.64, y: body.y - 25, width: 7, height: 38 }, z + 21, screenMaterial('#f7fbff'));
    addScreenRect(group, { x: body.x + body.width * 0.56, y: body.y - 11, width: 31, height: 7 }, z + 21.2, screenMaterial('#f7fbff'));
  } else if (key === 'garage') {
    addDistrictFacadeModule(group, { x: body.x + 13, y: body.y + 8, width: body.width * 0.72, height: body.height * 0.9 }, moduleZ, style, {
      columns: 3,
      rows: 4,
      yawDegrees: yaw,
    });
    addDistrictFacadeModule(group, { x: body.x + body.width * 0.68, y: body.y + 22, width: body.width * 0.3, height: body.height * 0.7 }, moduleZ + 0.4, style, {
      columns: 1,
      rows: 3,
      side: '#0d2d61',
      yawDegrees: yaw,
    });
    addDistrictRoofCap(group, { x: roof.x + 4, y: roof.y + 4, width: roof.width * 0.9, height: roof.height * 0.56 }, z + 19, style);
    addScreenRect(group, { x: portal.x + 4, y: portal.y + portal.height * 0.52, width: portal.width - 8, height: portal.height * 0.26 }, z + 21, screenMaterial('#071523', { opacity: 0.92 }));
    for (let line = 0; line < 4; line += 1) {
      addScreenRect(group, { x: portal.x + 9, y: portal.y + portal.height * 0.56 + line * 5, width: portal.width - 18, height: 2 }, z + 21.2, screenMaterial('#d8f7ff', { opacity: 0.22 }));
    }
  }
};

const drawCanvasIcon = (ctx, icon, x, y, size, accent) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#f7fbff';
  ctx.fillStyle = '#f7fbff';
  ctx.lineWidth = Math.max(2, size * 0.12);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = accent;
  ctx.shadowBlur = Math.max(4, size * 0.18);

  if (icon === 'dumbbell') {
    ctx.beginPath();
    ctx.moveTo(-size * 0.52, 0);
    ctx.lineTo(size * 0.52, 0);
    ctx.stroke();
    [-0.66, -0.48, 0.48, 0.66].forEach((offset) => {
      ctx.fillRect(size * offset - size * 0.04, -size * 0.28, size * 0.08, size * 0.56);
    });
  } else if (icon === 'utensils') {
    ctx.beginPath();
    ctx.moveTo(-size * 0.24, -size * 0.5);
    ctx.lineTo(-size * 0.24, size * 0.5);
    ctx.moveTo(-size * 0.42, -size * 0.48);
    ctx.lineTo(-size * 0.42, size * 0.08);
    ctx.moveTo(-size * 0.06, -size * 0.48);
    ctx.lineTo(-size * 0.06, size * 0.08);
    ctx.moveTo(-size * 0.42, size * 0.08);
    ctx.lineTo(-size * 0.06, size * 0.08);
    ctx.moveTo(size * 0.32, -size * 0.5);
    ctx.lineTo(size * 0.32, size * 0.5);
    ctx.stroke();
  } else if (icon === 'flask') {
    ctx.beginPath();
    ctx.moveTo(-size * 0.18, -size * 0.5);
    ctx.lineTo(size * 0.18, -size * 0.5);
    ctx.lineTo(size * 0.18, -size * 0.08);
    ctx.lineTo(size * 0.48, size * 0.48);
    ctx.lineTo(-size * 0.48, size * 0.48);
    ctx.lineTo(-size * 0.18, -size * 0.08);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.52;
    ctx.fillRect(-size * 0.28, size * 0.18, size * 0.56, size * 0.13);
    ctx.globalAlpha = 1;
  } else if (icon === 'cross') {
    ctx.fillRect(-size * 0.12, -size * 0.5, size * 0.24, size);
    ctx.fillRect(-size * 0.5, -size * 0.12, size, size * 0.24);
  } else if (icon === 'wrench') {
    ctx.rotate(-0.72);
    ctx.fillRect(-size * 0.08, -size * 0.46, size * 0.16, size * 0.84);
    ctx.beginPath();
    ctx.arc(0, -size * 0.45, size * 0.28, 0.68, Math.PI * 1.82);
    ctx.stroke();
  }
  ctx.restore();
};

const createMeasuredDistrictTexture = (key, target, style) => {
  const full = target.full;
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = Math.ceil(full.width * scale);
  canvas.height = Math.ceil(full.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.translate(-full.x, -full.y);

  const body = target.body;
  const roof = target.roof;
  const sign = target.sign;
  const portal = target.portal;
  const baseRgb = hexToRgb(style.base);
  const darkRgb = hexToRgb(style.dark);
  const accentRgb = hexToRgb(style.accent);

  const fillPoly = (points, fillStyle) => {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };

  const drawTextureBlock = (box, colors = {}, options = {}) => {
    const depth = options.depth ?? 8;
    const alpha = options.alpha ?? 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    fillPoly(
      [
        [box.x + box.width, box.y + depth * 0.25],
        [box.x + box.width + depth, box.y + depth],
        [box.x + box.width + depth, box.y + box.height + depth * 0.35],
        [box.x + box.width, box.y + box.height],
      ],
      colors.side || style.dark
    );
    fillPoly(
      [
        [box.x, box.y],
        [box.x + depth, box.y - depth * 0.45],
        [box.x + box.width + depth, box.y + depth * 0.2],
        [box.x + box.width, box.y + depth * 0.65],
      ],
      colors.top || style.roof
    );
    const blockGradient = ctx.createLinearGradient(box.x, box.y, box.x + box.width, box.y + box.height);
    const blockRgb = hexToRgb(colors.front || style.base);
    blockGradient.addColorStop(0, rgbString(mixRgb(blockRgb, { r: 255, g: 255, b: 255 }, 0.08)));
    blockGradient.addColorStop(0.72, rgbString(blockRgb));
    blockGradient.addColorStop(1, rgbString(mixRgb(blockRgb, darkRgb, 0.42)));
    ctx.fillStyle = blockGradient;
    ctx.fillRect(box.x, box.y, box.width, box.height);
    ctx.strokeStyle = 'rgba(4, 12, 22, 0.42)';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x + 1, box.y + 1, box.width - 2, box.height - 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(box.x + 4, box.y + 5, Math.max(6, box.width - 8), 3);
    ctx.restore();
  };

  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 9;
  ctx.fillStyle = 'rgba(7, 15, 24, 0.34)';
  ctx.beginPath();
  ctx.ellipse(full.x + full.width / 2, full.y + full.height - 20, full.width * 0.43, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const facadeGradient = ctx.createLinearGradient(body.x, body.y, body.x + body.width, body.y + body.height);
  facadeGradient.addColorStop(0, rgbString(mixRgb(baseRgb, { r: 255, g: 255, b: 255 }, 0.1)));
  facadeGradient.addColorStop(0.46, rgbString(mixRgb(baseRgb, darkRgb, 0.18)));
  facadeGradient.addColorStop(1, rgbString(mixRgb(baseRgb, darkRgb, 0.9)));
  ctx.fillStyle = facadeGradient;
  ctx.fillRect(body.x, body.y, body.width, body.height);
  ctx.strokeStyle = 'rgba(4, 12, 22, 0.42)';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(body.x + 1, body.y + 1, body.width - 2, body.height - 2);

  ctx.fillStyle = rgbString(darkRgb, 0.9);
  ctx.beginPath();
  ctx.moveTo(body.x + body.width, body.y + 10);
  ctx.lineTo(full.x + full.width - 5, body.y + 24);
  ctx.lineTo(full.x + full.width - 6, body.y + body.height - 8);
  ctx.lineTo(body.x + body.width, body.y + body.height);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(full.x + 5, body.y + 12, Math.max(24, body.width * 0.2), body.height * 0.82);
  ctx.fillStyle = rgbString(mixRgb(baseRgb, { r: 255, g: 255, b: 255 }, 0.1), 0.42);
  ctx.fillRect(body.x + 7, body.y + 12, 8, body.height - 30);
  ctx.fillStyle = rgbString(darkRgb, 0.38);
  ctx.fillRect(body.x, body.y + body.height - 18, body.width, 18);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(body.x + 6, body.y + 7);
  ctx.lineTo(body.x + body.width * 0.54, body.y + 3);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(3, 10, 18, 0.34)';
  ctx.beginPath();
  ctx.moveTo(body.x + body.width * 0.18, body.y + 3);
  ctx.lineTo(body.x + body.width * 0.14, body.y + body.height - 16);
  ctx.moveTo(body.x + body.width * 0.72, body.y + 8);
  ctx.lineTo(body.x + body.width * 0.76, body.y + body.height - 14);
  ctx.stroke();

  const roofGradient = ctx.createLinearGradient(roof.x, roof.y, roof.x + roof.width, roof.y + roof.height);
  roofGradient.addColorStop(0, '#ffffff');
  roofGradient.addColorStop(0.5, style.roof);
  roofGradient.addColorStop(1, rgbString(mixRgb(hexToRgb(style.roof), darkRgb, 0.12)));
  ctx.fillStyle = roofGradient;
  ctx.beginPath();
  ctx.moveTo(roof.x, roof.y + roof.height);
  ctx.lineTo(roof.x + roof.width * 0.16, roof.y + 3);
  ctx.lineTo(roof.x + roof.width * 0.88, roof.y);
  ctx.lineTo(roof.x + roof.width, roof.y + roof.height);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(8, 20, 30, 0.28)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(4, 12, 22, 0.54)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(roof.x + 2, roof.y + roof.height - 1);
  ctx.lineTo(roof.x + roof.width - 2, roof.y + roof.height - 1);
  ctx.stroke();

  if (key === 'gym') {
    drawTextureBlock(
      { x: full.x + 8, y: body.y + 23, width: 40, height: body.height * 0.72 },
      { front: '#69747d', side: '#34404b', top: '#edf5de' },
      { alpha: 0.96, depth: 9 }
    );
    drawTextureBlock(
      { x: body.x + body.width - 48, y: body.y + 38, width: 43, height: body.height * 0.48 },
      { front: '#2f8e4d', side: style.dark, top: '#d8efbf' },
      { alpha: 0.9, depth: 8 }
    );
  } else if (key === 'food') {
    drawTextureBlock(
      { x: body.x + 2, y: body.y + 19, width: body.width * 0.35, height: body.height * 0.74 },
      { front: '#d76d1e', side: '#703012', top: '#ffe0a0' },
      { alpha: 0.9, depth: 9 }
    );
    drawTextureBlock(
      { x: body.x + body.width * 0.62, y: body.y + 28, width: body.width * 0.3, height: body.height * 0.58 },
      { front: '#f28c2b', side: '#75300f', top: '#ffd78a' },
      { alpha: 0.88, depth: 8 }
    );
  } else if (key === 'lab') {
    drawTextureBlock(
      { x: body.x + body.width * 0.24, y: body.y + 10, width: body.width * 0.52, height: body.height * 0.84 },
      { front: '#8f55e8', side: '#291355', top: '#efddff' },
      { alpha: 0.9, depth: 8 }
    );
    drawTextureBlock(
      { x: body.x - 4, y: body.y + 43, width: 26, height: body.height * 0.5 },
      { front: '#5f34b7', side: '#25114e', top: '#cfb0ff' },
      { alpha: 0.82, depth: 7 }
    );
  } else if (key === 'clinic') {
    drawTextureBlock(
      { x: body.x + 8, y: body.y + 17, width: body.width * 0.58, height: body.height * 0.76 },
      { front: '#e84d4d', side: '#6c1722', top: '#fff7ec' },
      { alpha: 0.88, depth: 9 }
    );
    drawTextureBlock(
      { x: body.x + body.width * 0.68, y: body.y + 31, width: body.width * 0.27, height: body.height * 0.58 },
      { front: '#bd303a', side: '#621722', top: '#f7efe9' },
      { alpha: 0.86, depth: 8 }
    );
  } else if (key === 'garage') {
    drawTextureBlock(
      { x: body.x + 8, y: body.y + 20, width: body.width * 0.6, height: body.height * 0.72 },
      { front: '#2c82db', side: '#0d3269', top: '#e2f6ff' },
      { alpha: 0.88, depth: 10 }
    );
    drawTextureBlock(
      { x: body.x + body.width * 0.66, y: body.y + 31, width: body.width * 0.3, height: body.height * 0.6 },
      { front: '#195aa8', side: '#0b2857', top: '#bfeaff' },
      { alpha: 0.86, depth: 8 }
    );
  }

  ctx.strokeStyle = 'rgba(3, 10, 18, 0.3)';
  ctx.lineWidth = 1.8;
  [0.28, 0.5, 0.72].forEach((portion) => {
    ctx.beginPath();
    ctx.moveTo(body.x + body.width * portion, body.y + 8);
    ctx.lineTo(body.x + body.width * (portion + 0.025), body.y + body.height - 16);
    ctx.stroke();
  });
  for (let y = body.y + body.height * 0.24; y < body.y + body.height - 20; y += body.height * 0.18) {
    ctx.fillStyle = 'rgba(247, 251, 255, 0.16)';
    ctx.fillRect(body.x + 8, y, body.width * 0.72, 2);
    ctx.fillStyle = 'rgba(4, 12, 22, 0.2)';
    ctx.fillRect(body.x + 8, y + 2, body.width * 0.72, 2);
  }

  const rows = key === 'lab' ? 5 : 4;
  const columns = key === 'food' ? 5 : 4;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      if ((row + col) % 5 === 0) continue;
      const w = body.width * 0.06;
      const h = body.height * 0.07;
      const x = body.x + body.width * (0.18 + (col * 0.64) / Math.max(1, columns - 1)) - w / 2;
      const y = body.y + body.height * (0.17 + (row * 0.48) / Math.max(1, rows - 1));
      ctx.fillStyle = 'rgba(216, 241, 239, 0.58)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(6, 18, 30, 0.24)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = rgbString(accentRgb, 0.18);
      ctx.fillRect(x, y, w, 2);
    }
  }

  const portalGlow = ctx.createRadialGradient(
    portal.x + portal.width / 2,
    portal.y + portal.height / 2,
    10,
    portal.x + portal.width / 2,
    portal.y + portal.height / 2,
    portal.height * 0.72
  );
  portalGlow.addColorStop(0, rgbString(accentRgb, 0.28));
  portalGlow.addColorStop(0.42, rgbString(accentRgb, 0.14));
  portalGlow.addColorStop(1, rgbString(accentRgb, 0));
  ctx.fillStyle = portalGlow;
  ctx.beginPath();
  ctx.ellipse(portal.x + portal.width / 2, portal.y + portal.height / 2, portal.width * 0.58, portal.height * 0.64, 0, 0, Math.PI * 2);
  ctx.fill();
  const portalCx = portal.x + portal.width / 2;
  const portalLeft = portal.x + portal.width * 0.13;
  const portalRight = portal.x + portal.width * 0.87;
  const portalSpring = portal.y + portal.height * 0.46;
  const portalTop = portal.y + portal.height * 0.12;
  const portalBottom = portal.y + portal.height * 0.92;
  const drawPortalArch = () => {
    ctx.beginPath();
    ctx.moveTo(portalLeft, portalBottom);
    ctx.lineTo(portalLeft, portalSpring);
    ctx.quadraticCurveTo(portalCx, portalTop, portalRight, portalSpring);
    ctx.lineTo(portalRight, portalBottom);
    ctx.closePath();
  };
  drawPortalArch();
  ctx.fillStyle = 'rgba(4, 12, 23, 0.84)';
  ctx.fill();
  ctx.strokeStyle = style.accent;
  ctx.lineWidth = Math.max(6, portal.width * 0.12);
  ctx.shadowColor = style.accent;
  ctx.shadowBlur = 9;
  drawPortalArch();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#f7fbff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(portal.x + portal.width * 0.26, portal.y + portal.height * 0.84);
  ctx.lineTo(portal.x + portal.width * 0.26, portal.y + portal.height * 0.5);
  ctx.quadraticCurveTo(portalCx, portal.y + portal.height * 0.28, portal.x + portal.width * 0.74, portal.y + portal.height * 0.5);
  ctx.lineTo(portal.x + portal.width * 0.74, portal.y + portal.height * 0.84);
  ctx.stroke();
  ctx.fillStyle = rgbString(accentRgb, 0.22);
  ctx.fillRect(portal.x + portal.width * 0.34, portal.y + portal.height * 0.56, portal.width * 0.32, portal.height * 0.28);

  ctx.fillStyle = style.dark;
  ctx.fillRect(sign.x, sign.y, sign.width, sign.height);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(sign.x + 5, sign.y + 4, sign.width - 10, Math.max(3, sign.height * 0.16));
  ctx.strokeStyle = style.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(sign.x + 2, sign.y + 2, sign.width - 4, sign.height - 4);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(sign.x, sign.y, sign.width, sign.height);
  ctx.fillStyle = '#f7fbff';
  ctx.font = `900 ${Math.max(12, sign.height * 0.52)}px Impact, Arial Black, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowOffsetY = 2;
  ctx.fillText(style.sign, sign.x + sign.width / 2, sign.y + sign.height / 2 + 1, sign.width * 0.9);
  ctx.shadowOffsetY = 0;

  if (key === 'gym') {
    ctx.fillStyle = '#606a73';
    ctx.fillRect(full.x + 8, body.y + 18, 34, body.height * 0.78);
    ctx.fillStyle = '#e9f6c8';
    ctx.beginPath();
    ctx.moveTo(full.x + 12, body.y + 9);
    ctx.lineTo(full.x + 54, body.y - 6);
    ctx.lineTo(full.x + 70, body.y + 13);
    ctx.lineTo(full.x + 28, body.y + 24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2e7b44';
    ctx.fillRect(body.x + body.width - 42, body.y + body.height * 0.34, 38, body.height * 0.43);
  } else if (key === 'food') {
    ctx.fillStyle = style.roof;
    [-0.35, 0, 0.35].forEach((offset, index) => {
      ctx.fillRect(body.x + body.width * (0.5 + offset) - body.width * 0.12, body.y - 6 + index, body.width * 0.24, 10);
    });
    ctx.fillStyle = rgbString(darkRgb, 0.62);
    [-0.38, 0.38].forEach((offset) => {
      ctx.fillRect(body.x + body.width * (0.5 + offset) - 12, body.y + body.height - 54, 24, 45);
    });
  } else if (key === 'lab') {
    ctx.fillStyle = rgbString(hexToRgb('#bff8ff'), 0.72);
    [-0.34, 0.34].forEach((offset) => {
      ctx.fillRect(body.x + body.width * (0.5 + offset) - 4, body.y + body.height * 0.2, 8, body.height * 0.52);
      ctx.fillStyle = style.accent;
      ctx.fillRect(body.x + body.width * (0.5 + offset) - 6, body.y + body.height * 0.18, 12, 5);
      ctx.fillStyle = rgbString(hexToRgb('#bff8ff'), 0.72);
    });
    ctx.fillStyle = style.dark;
    ctx.fillRect(body.x + body.width * 0.3, body.y - 26, body.width * 0.4, 22);
  } else if (key === 'clinic') {
    ctx.fillStyle = '#f7fbff';
    ctx.fillRect(body.x + body.width * 0.58 + 10, body.y - 30, 8, 42);
    ctx.fillRect(body.x + body.width * 0.58 - 7, body.y - 14, 42, 8);
    ctx.fillStyle = rgbString(darkRgb, 0.74);
    ctx.fillRect(body.x + body.width - 34, body.y + 13, 31, body.height * 0.72);
  } else if (key === 'garage') {
    ctx.fillStyle = 'rgba(3, 12, 24, 0.68)';
    ctx.fillRect(body.x + 12, body.y + body.height - 45, body.width - 24, 34);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let y = body.y + body.height - 40; y < body.y + body.height - 16; y += 7) ctx.fillRect(body.x + 18, y, body.width - 36, 2);
    ctx.fillStyle = 'rgba(11, 16, 25, 0.92)';
    [-0.36, 0.36].forEach((offset) => {
      ctx.beginPath();
      ctx.ellipse(body.x + body.width * (0.5 + offset), body.y + body.height - 33, 10, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const drawFacadePanelPolish = () => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = 'rgba(3, 10, 18, 0.5)';
    ctx.lineWidth = 2.2;
    ctx.strokeRect(body.x + 2, body.y + 2, body.width - 4, body.height - 5);

    ctx.strokeStyle = 'rgba(247, 251, 255, 0.26)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(body.x + 7, body.y + 9);
    ctx.lineTo(body.x + body.width * 0.62, body.y + 6);
    ctx.moveTo(body.x + 8, body.y + body.height - 25);
    ctx.lineTo(portal.x - 9, body.y + body.height - 28);
    ctx.moveTo(portal.x + portal.width + 9, body.y + body.height - 28);
    ctx.lineTo(body.x + body.width - 12, body.y + body.height - 26);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(3, 10, 18, 0.36)';
    ctx.lineWidth = 2;
    for (let y = body.y + body.height * 0.3; y < body.y + body.height - 19; y += body.height * 0.17) {
      ctx.beginPath();
      ctx.moveTo(body.x + 10, y);
      ctx.lineTo(body.x + body.width - 11, y - 2);
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawPortalIconBadge = () => {
    const badgeSize = {
      clinic: 30,
      food: 32,
      garage: 34,
      gym: 35,
      lab: 29,
    }[key] || 31;
    const offset = {
      clinic: { x: -2, y: -34 },
      food: { x: 0, y: -34 },
      garage: { x: -38, y: -36 },
      gym: { x: -1, y: -34 },
      lab: { x: -1, y: -34 },
    }[key] || { x: 0, y: -34 };
    const cx = portal.x + portal.width / 2 + offset.x;
    const cy = portal.y + offset.y;

    ctx.save();
    ctx.shadowColor = style.accent;
    ctx.shadowBlur = 8;
    ctx.fillStyle = key === 'food' ? '#934014' : style.dark;
    ctx.beginPath();
    ctx.ellipse(cx, cy, badgeSize * 0.58, badgeSize * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = style.accent;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(247, 251, 255, 0.65)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    drawCanvasIcon(ctx, style.icon, cx, cy, badgeSize * 0.62, style.accent);
    ctx.restore();
  };

  drawFacadePanelPolish();
  drawPortalIconBadge();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const createDistrictOcclusionTexture = (key, target, style) => {
  const { body, full, portal, roof, sign } = target;
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = Math.ceil(full.width * scale);
  canvas.height = Math.ceil(full.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.translate(-full.x, -full.y);

  const baseRgb = hexToRgb(style.base);
  const darkRgb = hexToRgb(style.dark);
  const roofRgb = hexToRgb(style.roof);
  const fillPoly = (points, fillStyle) => {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };
  const drawBlock = (box, front, side, top) => {
    const depth = Math.max(6, box.width * 0.12);
    fillPoly(
      [
        [box.x + box.width, box.y + 8],
        [box.x + box.width + depth, box.y + 15],
        [box.x + box.width + depth * 0.78, box.y + box.height - 3],
        [box.x + box.width, box.y + box.height],
      ],
      side
    );
    fillPoly(
      [
        [box.x, box.y + 2],
        [box.x + depth * 0.42, box.y - depth * 0.35],
        [box.x + box.width + depth * 0.62, box.y + depth * 0.25],
        [box.x + box.width, box.y + depth * 0.8],
        [box.x + 4, box.y + depth * 0.62],
      ],
      top
    );
    const gradient = ctx.createLinearGradient(box.x, box.y, box.x + box.width, box.y + box.height);
    const frontRgb = hexToRgb(front);
    gradient.addColorStop(0, rgbString(mixRgb(frontRgb, { r: 255, g: 255, b: 255 }, 0.14), 0.98));
    gradient.addColorStop(0.64, rgbString(frontRgb, 0.98));
    gradient.addColorStop(1, rgbString(mixRgb(frontRgb, darkRgb, 0.48), 0.98));
    ctx.fillStyle = gradient;
    ctx.fillRect(box.x, box.y, box.width, box.height);
    ctx.strokeStyle = 'rgba(3, 10, 18, 0.48)';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x + 1, box.y + 1, box.width - 2, box.height - 2);
  };

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.38)';
  ctx.shadowBlur = 11;
  ctx.shadowOffsetY = 7;
  ctx.fillStyle = 'rgba(3, 10, 18, 0.62)';
  ctx.beginPath();
  ctx.ellipse(full.x + full.width / 2, full.y + full.height - 19, full.width * 0.42, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const bodyGradient = ctx.createLinearGradient(body.x, body.y, body.x + body.width, body.y + body.height);
  bodyGradient.addColorStop(0, rgbString(mixRgb(baseRgb, { r: 255, g: 255, b: 255 }, 0.1), 0.98));
  bodyGradient.addColorStop(0.62, rgbString(mixRgb(baseRgb, darkRgb, 0.14), 0.98));
  bodyGradient.addColorStop(1, rgbString(mixRgb(baseRgb, darkRgb, 0.72), 0.98));
  ctx.fillStyle = bodyGradient;
  ctx.fillRect(body.x, body.y, body.width, body.height);
  fillPoly(
    [
      [body.x + body.width * 0.7, body.y + 8],
      [full.x + full.width - 5, body.y + 24],
      [full.x + full.width - 7, body.y + body.height - 8],
      [body.x + body.width * 0.72, body.y + body.height],
    ],
    rgbString(mixRgb(darkRgb, { r: 2, g: 8, b: 16 }, 0.26), 0.98)
  );
  fillPoly(
    [
      [full.x + 6, body.y + 20],
      [body.x + body.width * 0.18, body.y + 8],
      [body.x + body.width * 0.15, body.y + body.height - 11],
      [full.x + 8, body.y + body.height],
    ],
    rgbString(mixRgb(darkRgb, { r: 255, g: 255, b: 255 }, key === 'gym' ? 0.22 : 0.08), 0.95)
  );
  fillPoly(
    [
      [roof.x, roof.y + roof.height],
      [roof.x + roof.width * 0.16, roof.y + 3],
      [roof.x + roof.width * 0.88, roof.y],
      [roof.x + roof.width, roof.y + roof.height],
      [roof.x + roof.width * 0.82, roof.y + roof.height + 8],
      [roof.x + roof.width * 0.13, roof.y + roof.height + 5],
    ],
    rgbString(mixRgb(roofRgb, { r: 255, g: 255, b: 255 }, 0.18), 0.98)
  );
  fillPoly(
    [
      [roof.x + roof.width * 0.72, roof.y + 3],
      [roof.x + roof.width, roof.y + roof.height],
      [roof.x + roof.width * 0.82, roof.y + roof.height + 8],
      [roof.x + roof.width * 0.61, roof.y + 8],
    ],
    rgbString(mixRgb(darkRgb, roofRgb, 0.16), 0.88)
  );

  if (key === 'gym') {
    drawBlock({ x: full.x + 8, y: body.y + 23, width: 42, height: body.height * 0.75 }, '#68737b', '#323d46', '#edf5de');
    drawBlock({ x: body.x + body.width - 47, y: body.y + 39, width: 42, height: body.height * 0.48 }, '#2f8a4b', style.dark, '#d8efbf');
  } else if (key === 'food') {
    drawBlock({ x: body.x + 3, y: body.y + 17, width: body.width * 0.36, height: body.height * 0.76 }, '#d96c1e', '#703012', '#ffe0a0');
    drawBlock({ x: body.x + body.width * 0.64, y: body.y + 27, width: body.width * 0.3, height: body.height * 0.6 }, '#f28a2a', '#75300f', '#ffd78a');
  } else if (key === 'lab') {
    drawBlock({ x: body.x + body.width * 0.25, y: body.y + 9, width: body.width * 0.52, height: body.height * 0.86 }, '#8e55e8', '#291355', '#efddff');
    drawBlock({ x: body.x - 5, y: body.y + 42, width: 25, height: body.height * 0.53 }, '#5c34b0', '#25114e', '#cfb0ff');
    drawBlock({ x: body.x + body.width - 20, y: body.y + 38, width: 24, height: body.height * 0.56 }, '#5930a8', '#25114e', '#cfb0ff');
  } else if (key === 'clinic') {
    drawBlock({ x: body.x + 8, y: body.y + 16, width: body.width * 0.6, height: body.height * 0.78 }, '#e84d4d', '#6c1722', '#fff7ec');
    drawBlock({ x: body.x + body.width * 0.68, y: body.y + 30, width: body.width * 0.28, height: body.height * 0.6 }, '#bd303a', '#621722', '#f7efe9');
  } else if (key === 'garage') {
    drawBlock({ x: body.x + 9, y: body.y + 19, width: body.width * 0.62, height: body.height * 0.74 }, '#2c82db', '#0d3269', '#e2f6ff');
    drawBlock({ x: body.x + body.width * 0.67, y: body.y + 31, width: body.width * 0.29, height: body.height * 0.6 }, '#195aa8', '#0b2857', '#bfeaff');
  }

  ctx.fillStyle = rgbString(mixRgb(darkRgb, { r: 2, g: 8, b: 16 }, 0.35), 0.86);
  ctx.fillRect(body.x + 6, body.y + body.height - 18, body.width - 10, 15);
  ctx.fillStyle = style.dark;
  ctx.fillRect(sign.x, sign.y, sign.width, sign.height);

  const portalCx = portal.x + portal.width / 2;
  const portalLeft = portal.x + portal.width * 0.08;
  const portalRight = portal.x + portal.width * 0.92;
  const portalSpring = portal.y + portal.height * 0.48;
  const portalTop = portal.y + portal.height * 0.04;
  const portalBottom = portal.y + portal.height * 1.02;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(portalLeft, portalBottom);
  ctx.lineTo(portalLeft, portalSpring);
  ctx.quadraticCurveTo(portalCx, portalTop, portalRight, portalSpring);
  ctx.lineTo(portalRight, portalBottom);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const createDistrictBodyReinforcementTexture = (key, target, style) => {
  const { body, full, portal, roof, sign } = target;
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = Math.ceil(full.width * scale);
  canvas.height = Math.ceil(full.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.translate(-full.x, -full.y);

  const baseRgb = hexToRgb(style.base);
  const darkRgb = hexToRgb(style.dark);
  const roofRgb = hexToRgb(style.roof);
  const fillPoly = (points, fillStyle) => {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };

  const bodyGradient = ctx.createLinearGradient(body.x, body.y, body.x + body.width, body.y + body.height);
  bodyGradient.addColorStop(0, rgbString(mixRgb(baseRgb, { r: 255, g: 255, b: 255 }, 0.12), 0.88));
  bodyGradient.addColorStop(0.58, rgbString(baseRgb, 0.9));
  bodyGradient.addColorStop(1, rgbString(mixRgb(baseRgb, darkRgb, 0.62), 0.92));
  ctx.fillStyle = bodyGradient;
  ctx.fillRect(body.x, body.y, body.width, body.height);
  fillPoly(
    [
      [body.x + body.width * 0.72, body.y + 8],
      [full.x + full.width - 6, body.y + 24],
      [full.x + full.width - 7, body.y + body.height - 9],
      [body.x + body.width * 0.76, body.y + body.height - 2],
    ],
    rgbString(mixRgb(darkRgb, { r: 3, g: 10, b: 18 }, 0.18), 0.8)
  );
  fillPoly(
    [
      [full.x + 7, body.y + 20],
      [body.x + body.width * 0.18, body.y + 8],
      [body.x + body.width * 0.15, body.y + body.height - 12],
      [full.x + 8, body.y + body.height - 2],
    ],
    rgbString(mixRgb(darkRgb, { r: 255, g: 255, b: 255 }, key === 'gym' ? 0.18 : 0.06), 0.72)
  );
  fillPoly(
    [
      [roof.x, roof.y + roof.height],
      [roof.x + roof.width * 0.16, roof.y + 3],
      [roof.x + roof.width * 0.88, roof.y],
      [roof.x + roof.width, roof.y + roof.height],
      [roof.x + roof.width * 0.82, roof.y + roof.height + 7],
      [roof.x + roof.width * 0.13, roof.y + roof.height + 5],
    ],
    rgbString(mixRgb(roofRgb, { r: 255, g: 255, b: 255 }, 0.14), 0.86)
  );

  ctx.strokeStyle = 'rgba(3, 10, 18, 0.34)';
  ctx.lineWidth = 2;
  ctx.strokeRect(body.x + 1, body.y + 1, body.width - 2, body.height - 3);
  ctx.fillStyle = rgbString(darkRgb, 0.78);
  ctx.fillRect(sign.x, sign.y, sign.width, sign.height);

  const portalCx = portal.x + portal.width / 2;
  const portalLeft = portal.x + portal.width * 0.08;
  const portalRight = portal.x + portal.width * 0.92;
  const portalSpring = portal.y + portal.height * 0.48;
  const portalTop = portal.y + portal.height * 0.04;
  const portalBottom = portal.y + portal.height * 1.02;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(portalLeft, portalBottom);
  ctx.lineTo(portalLeft, portalSpring);
  ctx.quadraticCurveTo(portalCx, portalTop, portalRight, portalSpring);
  ctx.lineTo(portalRight, portalBottom);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const createDistrictMicroDetailTexture = (key, target, style) => {
  const { body, full, portal, roof, sign } = target;
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = Math.ceil(full.width * scale);
  canvas.height = Math.ceil(full.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.translate(-full.x, -full.y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const accentRgb = hexToRgb(style.accent);
  const darkRgb = hexToRgb(style.dark);

  const fillPoly = (points, fillStyle) => {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };

  const stroke = (points, color, width) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  };

  fillPoly(
    [
      [body.x + body.width * 0.72, body.y + 10],
      [full.x + full.width - 4, body.y + 22],
      [full.x + full.width - 7, body.y + body.height - 9],
      [body.x + body.width * 0.76, body.y + body.height - 3],
    ],
    'rgba(3, 10, 18, 0.34)'
  );
  fillPoly(
    [
      [full.x + 6, body.y + 24],
      [body.x + body.width * 0.16, body.y + 13],
      [body.x + body.width * 0.14, body.y + body.height - 11],
      [full.x + 7, body.y + body.height],
    ],
    'rgba(255, 255, 255, 0.11)'
  );
  stroke(
    [
      [roof.x + 4, roof.y + roof.height - 2],
      [roof.x + roof.width - 5, roof.y + roof.height - 2],
    ],
    'rgba(3, 10, 18, 0.58)',
    3.2
  );
  stroke(
    [
      [roof.x + roof.width * 0.18, roof.y + 4],
      [roof.x + roof.width * 0.88, roof.y + 2],
    ],
    'rgba(247, 251, 255, 0.38)',
    2.2
  );

  const columns = key === 'food' ? 5 : key === 'lab' ? 3 : 4;
  const rows = key === 'lab' ? 5 : 4;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      if ((row + col + key.length) % 4 === 0) continue;
      const w = Math.max(4, body.width * 0.055);
      const h = Math.max(5, body.height * 0.065);
      const x = body.x + body.width * (0.18 + (col * 0.64) / Math.max(1, columns - 1)) - w / 2;
      const y = body.y + body.height * (0.18 + (row * 0.52) / Math.max(1, rows - 1));
      ctx.fillStyle = 'rgba(4, 12, 22, 0.35)';
      ctx.fillRect(x + 1, y + 1, w, h);
      ctx.fillStyle = row % 2 ? 'rgba(220, 249, 255, 0.68)' : 'rgba(247, 251, 255, 0.54)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = rgbString(accentRgb, 0.26);
      ctx.fillRect(x, y, w, 2);
    }
  }

  const portalCx = portal.x + portal.width / 2;
  const portalCy = portal.y + portal.height / 2;
  const glow = ctx.createRadialGradient(portalCx, portalCy, portal.width * 0.08, portalCx, portalCy, portal.width * 0.78);
  glow.addColorStop(0, rgbString(accentRgb, 0.24));
  glow.addColorStop(0.55, rgbString(accentRgb, 0.1));
  glow.addColorStop(1, rgbString(accentRgb, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(portalCx, portalCy, portal.width * 0.76, portal.height * 0.58, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(3, 10, 18, 0.55)';
  ctx.beginPath();
  ctx.ellipse(portalCx, portal.y + portal.height * 0.68, portal.width * 0.3, portal.height * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();

  stroke(
    [
      [body.x + 4, body.y + body.height - 14],
      [body.x + body.width - 6, body.y + body.height - 14],
    ],
    'rgba(3, 10, 18, 0.34)',
    3
  );
  stroke(
    [
      [body.x + 8, body.y + body.height - 22],
      [portal.x - 6, body.y + body.height - 22],
    ],
    'rgba(247, 251, 255, 0.28)',
    2.2
  );
  stroke(
    [
      [portal.x + portal.width + 6, body.y + body.height - 22],
      [body.x + body.width - 10, body.y + body.height - 22],
    ],
    'rgba(247, 251, 255, 0.22)',
    2.2
  );

  if (key === 'food') {
    ['#fff1b0', '#ff9a24', '#fff1b0'].forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.fillRect(body.x + body.width * (0.18 + index * 0.25), body.y + 4 + index, body.width * 0.18, 7);
    });
  } else if (key === 'lab') {
    ctx.strokeStyle = 'rgba(190, 248, 255, 0.62)';
    ctx.lineWidth = 4;
    [body.x + body.width * 0.27, body.x + body.width * 0.73].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, body.y + 30);
      ctx.lineTo(x + 4, body.y + body.height - 32);
      ctx.stroke();
    });
  } else if (key === 'garage') {
    ctx.fillStyle = 'rgba(3, 10, 18, 0.52)';
    ctx.fillRect(body.x + 12, body.y + body.height - 44, body.width - 24, 30);
    ctx.strokeStyle = 'rgba(220, 249, 255, 0.26)';
    ctx.lineWidth = 2;
    for (let y = body.y + body.height - 39; y < body.y + body.height - 16; y += 7) {
      ctx.beginPath();
      ctx.moveTo(body.x + 18, y);
      ctx.lineTo(body.x + body.width - 18, y);
      ctx.stroke();
    }
  } else if (key === 'clinic') {
    ctx.fillStyle = 'rgba(247, 251, 255, 0.8)';
    ctx.fillRect(body.x + body.width * 0.6, body.y - 27, 7, 34);
    ctx.fillRect(body.x + body.width * 0.52, body.y - 14, 32, 7);
  } else if (key === 'gym') {
    ctx.strokeStyle = rgbString(darkRgb, 0.58);
    ctx.lineWidth = 4;
    stroke(
      [
        [body.x + body.width * 0.58, body.y + 20],
        [body.x + body.width * 0.58, body.y + body.height - 20],
      ],
      rgbString(darkRgb, 0.58),
      4
    );
  }

  ctx.fillStyle = 'rgba(3, 10, 18, 0.35)';
  ctx.fillRect(sign.x + 2, sign.y + sign.height - 4, sign.width - 4, 3);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const createDistrictReferenceOverlayTexture = (key, target, style) => {
  const { body, full, portal, sign } = target;
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = Math.ceil(full.width * scale);
  canvas.height = Math.ceil(full.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.translate(-full.x, -full.y);

  const darkRgb = hexToRgb(style.dark);
  const poly = (points, fillStyle) => {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };
  const block = (box, front, side = style.dark, top = style.roof, depth = 9, alpha = 0.96) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    poly(
      [
        [box.x + box.width, box.y + depth * 0.2],
        [box.x + box.width + depth, box.y + depth],
        [box.x + box.width + depth, box.y + box.height + depth * 0.24],
        [box.x + box.width, box.y + box.height],
      ],
      side
    );
    poly(
      [
        [box.x, box.y],
        [box.x + depth, box.y - depth * 0.48],
        [box.x + box.width + depth, box.y + depth * 0.2],
        [box.x + box.width, box.y + depth * 0.68],
      ],
      top
    );
    const gradient = ctx.createLinearGradient(box.x, box.y, box.x + box.width, box.y + box.height);
    const rgb = hexToRgb(front);
    gradient.addColorStop(0, rgbString(mixRgb(rgb, { r: 255, g: 255, b: 255 }, 0.18)));
    gradient.addColorStop(0.56, rgbString(rgb));
    gradient.addColorStop(1, rgbString(mixRgb(rgb, darkRgb, 0.46)));
    ctx.fillStyle = gradient;
    ctx.fillRect(box.x, box.y, box.width, box.height);
    ctx.strokeStyle = 'rgba(4, 12, 22, 0.38)';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(box.x + 1, box.y + 1, box.width - 2, box.height - 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(box.x + 4, box.y + 5, Math.max(8, box.width - 8), 3);
    ctx.restore();
  };
  const windows = (box, columns, rows, color = '#dff8ff', alpha = 0.54) => {
    ctx.fillStyle = rgbString(hexToRgb(color), alpha);
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        if ((row + col) % 4 === 0) continue;
        const w = Math.max(4, box.width * 0.07);
        const h = Math.max(5, box.height * 0.07);
        const x = box.x + box.width * (0.16 + (col * 0.68) / Math.max(1, columns - 1)) - w / 2;
        const y = box.y + box.height * (0.18 + (row * 0.56) / Math.max(1, rows - 1));
        ctx.fillRect(x, y, w, h);
      }
    }
  };
  const arch = () => {
    const cx = portal.x + portal.width / 2;
    const left = portal.x + portal.width * 0.18;
    const right = portal.x + portal.width * 0.82;
    const spring = portal.y + portal.height * 0.5;
    const top = portal.y + portal.height * 0.18;
    const bottom = portal.y + portal.height * 0.91;
    const draw = () => {
      ctx.beginPath();
      ctx.moveTo(left, bottom);
      ctx.lineTo(left, spring);
      ctx.quadraticCurveTo(cx, top, right, spring);
      ctx.lineTo(right, bottom);
    };
    ctx.save();
    ctx.shadowColor = style.accent;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = style.accent;
    ctx.lineWidth = Math.max(6, portal.width * 0.1);
    draw();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#f7fbff';
    ctx.lineWidth = 1.8;
    draw();
    ctx.stroke();
    ctx.restore();
  };
  const badge = () => {
    const sizeByKey = {
      clinic: 31,
      food: 33,
      garage: 34,
      gym: 36,
      lab: 30,
    };
    const offsetByKey = {
      clinic: { x: -2, y: -34 },
      food: { x: 0, y: -34 },
      garage: { x: -39, y: -36 },
      gym: { x: -1, y: -33 },
      lab: { x: -1, y: -34 },
    };
    const size = sizeByKey[key] || 32;
    const offset = offsetByKey[key] || { x: 0, y: -34 };
    const cx = portal.x + portal.width / 2 + offset.x;
    const cy = portal.y + offset.y;
    ctx.save();
    ctx.globalAlpha = 0.94;
    ctx.shadowColor = style.accent;
    ctx.shadowBlur = 7;
    ctx.fillStyle = key === 'food' ? '#9a4215' : style.dark;
    ctx.beginPath();
    ctx.ellipse(cx, cy, size * 0.58, size * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = style.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    drawCanvasIcon(ctx, style.icon, cx, cy, size * 0.62, style.accent);
    ctx.restore();
  };

  ctx.fillStyle = 'rgba(3, 10, 18, 0.22)';
  ctx.beginPath();
  ctx.ellipse(full.x + full.width / 2, full.y + full.height - 23, full.width * 0.42, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  if (key === 'gym') {
    block({ x: full.x + 10, y: body.y + 30, width: 42, height: body.height * 0.74 }, '#69747d', '#38434c', '#edf5de', 10, 0.92);
    block({ x: body.x + 40, y: body.y + 5, width: body.width * 0.58, height: body.height * 0.9 }, '#43af57', '#1c5c35', '#e9f6c8', 11, 0.96);
    block({ x: body.x + body.width - 47, y: body.y + 42, width: 42, height: body.height * 0.46 }, '#2f8e4d', '#1c5c35', '#d8efbf', 8, 0.9);
    windows({ x: body.x + 71, y: body.y + 40, width: body.width * 0.48, height: body.height * 0.48 }, 3, 3, '#dff8ff', 0.42);
  } else if (key === 'food') {
    block({ x: body.x + 4, y: body.y + 12, width: body.width * 0.42, height: body.height * 0.82 }, '#f28b2e', '#7a300e', '#ffe0a0', 10, 0.96);
    for (let level = 0; level < 4; level += 1) {
      const y = body.y + 14 + level * 20;
      ctx.fillStyle = level % 2 ? '#d86418' : '#ff922b';
      ctx.fillRect(body.x + 6, y, body.width * 0.42, 12);
      ctx.fillStyle = 'rgba(255, 219, 142, 0.58)';
      ctx.fillRect(body.x + 9, y + 3, body.width * 0.36, 3);
    }
    block({ x: body.x + body.width * 0.48, y: body.y + 24, width: body.width * 0.44, height: body.height * 0.62 }, '#d9691d', '#6f2e0d', '#ffd78a', 8, 0.9);
    windows({ x: body.x + body.width * 0.55, y: body.y + 38, width: body.width * 0.35, height: body.height * 0.36 }, 2, 3, '#dff8ff', 0.38);
  } else if (key === 'lab') {
    block({ x: body.x + body.width * 0.22, y: body.y + 4, width: body.width * 0.58, height: body.height * 0.94 }, '#8f55e8', '#291355', '#efddff', 9, 0.96);
    block({ x: body.x - 2, y: body.y + 42, width: 23, height: body.height * 0.54 }, '#5d34b3', '#25114e', '#cfb0ff', 7, 0.86);
    block({ x: body.x + body.width - 20, y: body.y + 38, width: 23, height: body.height * 0.58 }, '#5b32aa', '#25114e', '#cfb0ff', 7, 0.84);
    windows({ x: body.x + body.width * 0.31, y: body.y + 30, width: body.width * 0.42, height: body.height * 0.5 }, 3, 4, '#bff8ff', 0.5);
  } else if (key === 'clinic') {
    block({ x: body.x + 8, y: body.y + 12, width: body.width * 0.58, height: body.height * 0.82 }, '#e84d4d', '#6c1722', '#fff7ec', 10, 0.95);
    block({ x: body.x + body.width * 0.65, y: body.y + 28, width: body.width * 0.3, height: body.height * 0.6 }, '#bd303a', '#621722', '#f7efe9', 8, 0.9);
    windows({ x: body.x + 22, y: body.y + 42, width: body.width * 0.62, height: body.height * 0.42 }, 3, 3, '#dff8ff', 0.42);
  } else if (key === 'garage') {
    block({ x: body.x + 9, y: body.y + 18, width: body.width * 0.64, height: body.height * 0.74 }, '#2c82db', '#0d3269', '#e2f6ff', 11, 0.94);
    block({ x: body.x + body.width * 0.66, y: body.y + 34, width: body.width * 0.29, height: body.height * 0.52 }, '#195aa8', '#0b2857', '#bfeaff', 8, 0.88);
    ctx.fillStyle = 'rgba(4, 12, 23, 0.74)';
    ctx.fillRect(body.x + 22, body.y + body.height - 48, body.width - 48, 32);
    for (let y = body.y + body.height - 42; y < body.y + body.height - 18; y += 7) {
      ctx.fillStyle = 'rgba(216, 247, 255, 0.3)';
      ctx.fillRect(body.x + 28, y, body.width - 60, 2);
    }
  }

  ctx.save();
  let polish = ctx.createLinearGradient(body.x, body.y, body.x + body.width, body.y + body.height);
  polish.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
  polish.addColorStop(0.34, 'rgba(255, 255, 255, 0.02)');
  polish.addColorStop(0.7, 'rgba(5, 10, 19, 0.1)');
  polish.addColorStop(1, 'rgba(5, 10, 19, 0.34)');
  ctx.fillStyle = polish;
  ctx.fillRect(body.x + 2, body.y + 2, body.width - 4, body.height - 4);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = rgbString(hexToRgb(style.accent), 0.16);
  ctx.fillRect(body.x + body.width * 0.08, body.y + 8, body.width * 0.52, 5);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(body.x + body.width * 0.12, body.y + body.height * 0.18, body.width * 0.12, body.height * 0.5);
  ctx.restore();

  ctx.strokeStyle = 'rgba(3, 8, 18, 0.46)';
  ctx.lineWidth = 2.2;
  ctx.strokeRect(body.x + 1.5, body.y + 1.5, body.width - 3, body.height - 3);
  ctx.strokeStyle = rgbString(darkRgb, 0.74);
  ctx.lineWidth = 2;
  for (let y = body.y + body.height * 0.28; y < body.y + body.height - 18; y += body.height * 0.18) {
    ctx.beginPath();
    ctx.moveTo(body.x + 8, y);
    ctx.lineTo(body.x + body.width - 8, y - 3);
    ctx.stroke();
  }

  const trimColumns = key === 'food' ? 5 : key === 'lab' ? 3 : 4;
  for (let col = 0; col < trimColumns; col += 1) {
    const x = body.x + body.width * (0.18 + (col * 0.64) / Math.max(1, trimColumns - 1));
    ctx.fillStyle = 'rgba(3, 8, 18, 0.2)';
    ctx.fillRect(x - 4, body.y + body.height * 0.2, 8, body.height * 0.5);
    ctx.fillStyle = 'rgba(224, 251, 255, 0.52)';
    ctx.fillRect(x - 3, body.y + body.height * 0.2 + 2, 5, body.height * 0.12);
  }

  arch();
  badge();
  ctx.fillStyle = style.dark;
  ctx.fillRect(sign.x, sign.y, sign.width, sign.height);
  ctx.strokeStyle = 'rgba(4, 12, 22, 0.62)';
  ctx.lineWidth = 2;
  ctx.strokeRect(sign.x, sign.y, sign.width, sign.height);
  ctx.fillStyle = '#f7fbff';
  ctx.font = `900 ${Math.max(12, sign.height * 0.5)}px Impact, Arial Black, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(style.sign, sign.x + sign.width / 2, sign.y + sign.height / 2 + 1, sign.width * 0.88);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const createDistrictTraceIllustrationTexture = (key, target, style) => {
  const { body, full, portal, roof, sign } = target;
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = Math.ceil(full.width * scale);
  canvas.height = Math.ceil(full.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.translate(-full.x, -full.y);

  const drawPoly = (points, fillStyle, options = {}) => {
    ctx.save();
    ctx.globalAlpha = options.opacity ?? 1;
    if (options.shadow) {
      ctx.shadowColor = options.shadow.color;
      ctx.shadowBlur = options.shadow.blur;
      ctx.shadowOffsetY = options.shadow.y ?? 0;
    }
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    if (options.stroke) {
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = options.stroke.color;
      ctx.lineWidth = options.stroke.width ?? 2;
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawRect = (box, fillStyle, options = {}) => {
    ctx.save();
    ctx.globalAlpha = options.opacity ?? 1;
    if (options.angle) {
      ctx.translate(box.x + box.width / 2, box.y + box.height / 2);
      ctx.rotate((options.angle * Math.PI) / 180);
      ctx.translate(-(box.x + box.width / 2), -(box.y + box.height / 2));
    }
    ctx.fillStyle = fillStyle;
    ctx.fillRect(box.x, box.y, box.width, box.height);
    if (options.stroke) {
      ctx.strokeStyle = options.stroke.color;
      ctx.lineWidth = options.stroke.width ?? 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
    }
    ctx.restore();
  };

  const drawLine = (points, color, width = 2, opacity = 1) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.restore();
  };

  const windowGrid = (box, columns, rows, options = {}) => {
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        if ((row + col + (options.skip || 0)) % 4 === 0) continue;
        const w = Math.max(4, box.width * (options.windowW || 0.08));
        const h = Math.max(5, box.height * (options.windowH || 0.085));
        const x = box.x + box.width * (0.16 + (col * 0.68) / Math.max(1, columns - 1)) - w / 2;
        const y = box.y + box.height * (0.2 + (row * 0.56) / Math.max(1, rows - 1));
        drawRect({ x, y, width: w, height: h }, options.color || 'rgba(216, 248, 255, 0.54)', {
          opacity: options.opacity ?? 1,
          stroke: { color: 'rgba(3, 10, 18, 0.24)', width: 1 },
        });
      }
    }
  };

  const palette = {
    gym: { main: '#3ea658', side: '#5f6b72', dark: '#12351f', roof: '#e9f6c8', light: '#9ac867' },
    food: { main: '#e17825', side: '#7b300e', dark: '#542009', roof: '#ffd68a', light: '#ffae44' },
    lab: { main: '#8b50df', side: '#281253', dark: '#1d0c45', roof: '#eedaff', light: '#b76cff' },
    clinic: { main: '#e14949', side: '#7c1f2b', dark: '#4f111b', roof: '#fff4e9', light: '#ff8077' },
    garage: { main: '#287ad3', side: '#0d2f67', dark: '#061a3d', roof: '#dff6ff', light: '#7bd9ff' },
  }[key];

  drawPoly(
    [
      [full.x + full.width * 0.08, full.y + full.height - 33],
      [full.x + full.width * 0.9, full.y + full.height - 28],
      [full.x + full.width * 1.04, full.y + full.height - 4],
      [full.x + full.width * 0.22, full.y + full.height + 7],
    ],
    'rgba(3, 10, 18, 0.28)'
  );

  const layouts = {
    gym: {
      faces: [
        { fill: palette.side, points: [[full.x + 8, body.y + 30], [body.x + 30, body.y + 12], [body.x + 30, body.y + body.height - 6], [full.x + 8, body.y + body.height + 8]], opacity: 0.94 },
        { fill: palette.main, points: [[body.x + 28, body.y + 5], [body.x + body.width * 0.82, body.y + 13], [body.x + body.width * 0.82, body.y + body.height - 10], [body.x + 28, body.y + body.height]], opacity: 0.98 },
        { fill: palette.dark, points: [[body.x + body.width * 0.82, body.y + 18], [full.x + full.width - 7, body.y + 32], [full.x + full.width - 8, body.y + body.height - 22], [body.x + body.width * 0.82, body.y + body.height - 8]], opacity: 0.72 },
      ],
      roof: [[roof.x - 2, roof.y + roof.height], [roof.x + roof.width * 0.18, roof.y + 4], [roof.x + roof.width * 0.86, roof.y], [roof.x + roof.width + 5, roof.y + roof.height * 0.84], [roof.x + roof.width * 0.75, roof.y + roof.height + 8]],
      windows: [{ box: { x: body.x + 50, y: body.y + 34, width: body.width * 0.42, height: body.height * 0.42 }, columns: 3, rows: 3 }],
    },
    food: {
      faces: [
        { fill: '#d4681d', points: [[body.x, body.y + 13], [body.x + body.width * 0.42, body.y + 3], [body.x + body.width * 0.43, body.y + body.height - 4], [body.x, body.y + body.height + 8]], opacity: 0.98 },
        { fill: palette.main, points: [[body.x + body.width * 0.38, body.y + 22], [body.x + body.width * 0.9, body.y + 14], [body.x + body.width * 0.9, body.y + body.height - 15], [body.x + body.width * 0.38, body.y + body.height - 3]], opacity: 0.94 },
        { fill: palette.side, points: [[body.x + body.width * 0.9, body.y + 17], [full.x + full.width - 2, body.y + 28], [full.x + full.width - 5, body.y + body.height - 22], [body.x + body.width * 0.9, body.y + body.height - 15]], opacity: 0.72 },
      ],
      roof: [[roof.x, roof.y + roof.height], [roof.x + roof.width * 0.22, roof.y + 5], [roof.x + roof.width * 0.86, roof.y + 3], [roof.x + roof.width + 5, roof.y + roof.height * 0.82], [roof.x + roof.width * 0.67, roof.y + roof.height + 7]],
      windows: [{ box: { x: body.x + 8, y: body.y + 20, width: body.width * 0.34, height: body.height * 0.54 }, columns: 2, rows: 4 }],
    },
    lab: {
      faces: [
        { fill: palette.side, points: [[body.x - 5, body.y + 36], [body.x + 16, body.y + 16], [body.x + 16, body.y + body.height - 5], [body.x - 6, body.y + body.height + 7]], opacity: 0.74 },
        { fill: palette.main, points: [[body.x + 16, body.y + 2], [body.x + body.width * 0.82, body.y + 9], [body.x + body.width * 0.82, body.y + body.height - 7], [body.x + 16, body.y + body.height]], opacity: 0.98 },
        { fill: palette.dark, points: [[body.x + body.width * 0.82, body.y + 12], [full.x + full.width - 2, body.y + 25], [full.x + full.width - 7, body.y + body.height - 14], [body.x + body.width * 0.82, body.y + body.height - 7]], opacity: 0.72 },
      ],
      roof: [[roof.x, roof.y + roof.height], [roof.x + roof.width * 0.17, roof.y + 2], [roof.x + roof.width * 0.9, roof.y], [roof.x + roof.width + 7, roof.y + roof.height * 0.9], [roof.x + roof.width * 0.76, roof.y + roof.height + 8]],
      windows: [{ box: { x: body.x + 30, y: body.y + 32, width: body.width * 0.42, height: body.height * 0.48 }, columns: 3, rows: 4 }],
    },
    clinic: {
      faces: [
        { fill: palette.main, points: [[body.x + 3, body.y + 12], [body.x + body.width * 0.78, body.y + 4], [body.x + body.width * 0.78, body.y + body.height - 8], [body.x + 3, body.y + body.height]], opacity: 0.98 },
        { fill: palette.side, points: [[body.x + body.width * 0.78, body.y + 8], [full.x + full.width - 2, body.y + 24], [full.x + full.width - 6, body.y + body.height - 11], [body.x + body.width * 0.78, body.y + body.height - 8]], opacity: 0.76 },
        { fill: '#ff8c82', points: [[body.x + 12, body.y + 20], [body.x + body.width * 0.55, body.y + 15], [body.x + body.width * 0.55, body.y + 28], [body.x + 12, body.y + 35]], opacity: 0.34 },
      ],
      roof: [[roof.x - 7, roof.y + roof.height], [roof.x + roof.width * 0.12, roof.y + 6], [roof.x + roof.width * 0.88, roof.y], [roof.x + roof.width + 23, roof.y + roof.height * 0.88], [roof.x + roof.width * 0.78, roof.y + roof.height + 8]],
      windows: [{ box: { x: body.x + 20, y: body.y + 36, width: body.width * 0.5, height: body.height * 0.38 }, columns: 3, rows: 3 }],
    },
    garage: {
      faces: [
        { fill: palette.main, points: [[body.x + 6, body.y + 10], [body.x + body.width * 0.78, body.y + 4], [body.x + body.width * 0.78, body.y + body.height - 8], [body.x + 6, body.y + body.height]], opacity: 0.98 },
        { fill: palette.side, points: [[body.x + body.width * 0.78, body.y + 8], [full.x + full.width - 3, body.y + 27], [full.x + full.width - 8, body.y + body.height - 10], [body.x + body.width * 0.78, body.y + body.height - 8]], opacity: 0.82 },
        { fill: '#7bd9ff', points: [[body.x + 14, body.y + 22], [body.x + body.width * 0.56, body.y + 17], [body.x + body.width * 0.56, body.y + 30], [body.x + 14, body.y + 38]], opacity: 0.28 },
      ],
      roof: [[roof.x - 2, roof.y + roof.height], [roof.x + roof.width * 0.15, roof.y + 4], [roof.x + roof.width * 0.84, roof.y], [roof.x + roof.width + 13, roof.y + roof.height * 0.9], [roof.x + roof.width * 0.72, roof.y + roof.height + 7]],
      windows: [{ box: { x: body.x + 24, y: body.y + 34, width: body.width * 0.5, height: body.height * 0.34 }, columns: 3, rows: 3 }],
    },
  }[key];

  layouts.faces.forEach((face) => {
    drawPoly(face.points, face.fill, {
      opacity: face.opacity,
      shadow: { color: 'rgba(0, 0, 0, 0.22)', blur: 3, y: 2 },
      stroke: { color: 'rgba(3, 10, 18, 0.42)', width: 2 },
    });
  });
  drawPoly(layouts.roof, palette.roof, {
    opacity: 0.96,
    shadow: { color: 'rgba(0, 0, 0, 0.18)', blur: 2, y: 2 },
    stroke: { color: 'rgba(3, 10, 18, 0.32)', width: 2 },
  });
  drawLine(layouts.roof.slice(0, 4), '#f7fbff', 2, 0.34);

  layouts.windows.forEach((item) => windowGrid(item.box, item.columns, item.rows, { color: '#dff8ff', opacity: 0.58 }));
  for (let line = 1; line <= 4; line += 1) {
    const y = body.y + body.height * (0.2 + line * 0.13);
    drawLine([[body.x + 8, y], [body.x + body.width - 8, y - 3]], key === 'food' ? '#7b300e' : palette.dark, 1.8, 0.34);
  }

  const portalCx = portal.x + portal.width / 2;
  const portalLeft = portal.x + portal.width * 0.18;
  const portalRight = portal.x + portal.width * 0.82;
  const portalTop = portal.y + portal.height * 0.18;
  const portalSpring = portal.y + portal.height * 0.5;
  const portalBottom = portal.y + portal.height * 0.92;
  const drawPortalPath = () => {
    ctx.beginPath();
    ctx.moveTo(portalLeft, portalBottom);
    ctx.lineTo(portalLeft, portalSpring);
    ctx.quadraticCurveTo(portalCx, portalTop, portalRight, portalSpring);
    ctx.lineTo(portalRight, portalBottom);
  };
  ctx.save();
  const glow = ctx.createRadialGradient(portalCx, portal.y + portal.height * 0.58, 8, portalCx, portal.y + portal.height * 0.58, portal.height * 0.62);
  glow.addColorStop(0, rgbString(hexToRgb(style.accent), 0.28));
  glow.addColorStop(0.48, rgbString(hexToRgb(style.accent), 0.1));
  glow.addColorStop(1, rgbString(hexToRgb(style.accent), 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(portalCx, portal.y + portal.height * 0.62, portal.width * 0.58, portal.height * 0.56, 0, 0, Math.PI * 2);
  ctx.fill();
  drawPortalPath();
  ctx.fillStyle = 'rgba(4, 11, 22, 0.9)';
  ctx.fill();
  ctx.shadowColor = style.accent;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = style.accent;
  ctx.lineWidth = Math.max(6, portal.width * 0.11);
  drawPortalPath();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#f7fbff';
  ctx.lineWidth = 2;
  drawPortalPath();
  ctx.stroke();
  ctx.restore();

  const badgeSize = key === 'garage' ? 33 : key === 'food' ? 32 : 34;
  const badgeX = portalCx + (key === 'garage' ? -42 : 0);
  const badgeY = portal.y - (key === 'lab' ? 36 : 33);
  ctx.save();
  ctx.shadowColor = style.accent;
  ctx.shadowBlur = 7;
  ctx.fillStyle = key === 'food' ? '#9a4215' : palette.dark;
  ctx.beginPath();
  ctx.ellipse(badgeX, badgeY, badgeSize * 0.55, badgeSize * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = style.accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  drawCanvasIcon(ctx, style.icon, badgeX, badgeY, badgeSize * 0.58, style.accent);
  ctx.restore();

  drawRect(sign, palette.dark, { opacity: 1, stroke: { color: 'rgba(3, 10, 18, 0.72)', width: 3 } });
  drawRect({ x: sign.x + 4, y: sign.y + 4, width: sign.width - 8, height: Math.max(3, sign.height * 0.15) }, '#f7fbff', { opacity: 0.16 });
  ctx.fillStyle = '#f7fbff';
  ctx.font = `900 ${Math.max(12, sign.height * 0.5)}px Impact, Arial Black, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 2;
  ctx.fillText(style.sign, sign.x + sign.width / 2, sign.y + sign.height / 2 + 1, sign.width * 0.88);
  ctx.shadowBlur = 0;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const addMeasuredDistrictDepthAccents = (group, target, style, z) => {
  const { body, full, roof } = target;
  addScreenPolygon(
    group,
    [
      [body.x + body.width * 0.72, body.y + 7],
      [full.x + full.width - 5, body.y + 22],
      [full.x + full.width - 6, body.y + body.height - 9],
      [body.x + body.width * 0.83, body.y + body.height - 2],
    ],
    z,
    screenMaterial(style.dark, { opacity: 0.78 })
  );
  addScreenPolygon(
    group,
    [
      [full.x + 8, body.y + 15],
      [body.x + body.width * 0.2, body.y + 5],
      [body.x + body.width * 0.16, body.y + body.height - 14],
      [full.x + 5, body.y + body.height - 3],
    ],
    z + 0.1,
    screenMaterial('#061522', { opacity: 0.54 })
  );
  addScreenPolygon(
    group,
    [
      [roof.x + roof.width * 0.12, roof.y + 3],
      [roof.x + roof.width * 0.9, roof.y],
      [roof.x + roof.width, roof.y + roof.height],
      [roof.x + roof.width * 0.76, roof.y + roof.height + 8],
    ],
    z + 0.2,
    screenMaterial(style.dark, { opacity: 0.64 })
  );
  addScreenRect(
    group,
    { x: body.x + body.width * 0.1, y: body.y + 8, width: body.width * 0.58, height: 4 },
    z + 0.3,
    screenMaterial('#f7fbff', { opacity: 0.26 })
  );
  addScreenRect(
    group,
    { x: body.x + body.width * 0.1, y: body.y + body.height - 14, width: body.width * 0.74, height: 5 },
    z + 0.4,
    screenMaterial('#061522', { opacity: 0.46 })
  );
};

const addScreenBoxOutline = (group, box, z, color = '#061522', thickness = 3, opacity = 0.72) => {
  const material = screenMaterial(color, { opacity });
  addScreenRect(group, { x: box.x, y: box.y, width: box.width, height: thickness }, z, material);
  addScreenRect(group, { x: box.x, y: box.y + box.height - thickness, width: box.width, height: thickness }, z, material);
  addScreenRect(group, { x: box.x, y: box.y, width: thickness, height: box.height }, z, material);
  addScreenRect(group, { x: box.x + box.width - thickness, y: box.y, width: thickness, height: box.height }, z, material);
};

const addMeasuredDistrictSpecificDetails = (group, key, target, style, z) => {
  const { body, portal } = target;
  if (key === 'food') {
    [0.2, 0.5, 0.8].forEach((portion, index) => {
      addScreenRect(
        group,
        { x: body.x + body.width * portion - 18, y: body.y + body.height - 60 + index, width: 36, height: 8 },
        z,
        screenMaterial(index % 2 ? style.roof : style.accent, { opacity: 0.92 })
      );
      addScreenRect(
        group,
        { x: body.x + body.width * portion - 13, y: body.y + body.height - 50, width: 26, height: 37 },
        z + 0.2,
        screenMaterial(style.dark, { opacity: 0.52 })
      );
    });
  } else if (key === 'lab') {
    [-0.32, 0.32].forEach((offset) => {
      addScreenRect(
        group,
        { x: body.x + body.width * (0.5 + offset) - 5, y: body.y + 26, width: 10, height: body.height * 0.54 },
        z,
        screenMaterial('#bff8ff', { opacity: 0.46 })
      );
      addScreenRect(
        group,
        { x: body.x + body.width * (0.5 + offset) - 7, y: body.y + 22, width: 14, height: 5 },
        z + 0.2,
        screenMaterial(style.accent, { opacity: 0.62 })
      );
    });
  } else if (key === 'clinic') {
    addScreenRect(group, { x: body.x + body.width * 0.62, y: body.y - 26, width: 8, height: 42 }, z, screenMaterial('#f7fbff', { opacity: 0.88 }));
    addScreenRect(group, { x: body.x + body.width * 0.52, y: body.y - 10, width: 44, height: 8 }, z + 0.2, screenMaterial('#f7fbff', { opacity: 0.88 }));
  } else if (key === 'garage') {
    for (let line = 0; line < 5; line += 1) {
      addScreenRect(
        group,
        { x: portal.x + 9, y: portal.y + portal.height * 0.57 + line * 5, width: portal.width - 18, height: 2 },
        z,
        screenMaterial('#d8f7ff', { opacity: 0.34 })
      );
    }
    [-0.34, 0.34].forEach((offset) => {
      addScreenEllipse(
        group,
        { x: body.x + body.width * (0.5 + offset) - 12, y: body.y + body.height - 42, width: 24, height: 24 },
        z + 0.2,
        screenMaterial('#07101b', { opacity: 0.78 })
      );
    });
  } else if (key === 'gym') {
    addScreenRect(group, { x: body.x + body.width - 42, y: body.y + 34, width: 38, height: body.height * 0.45 }, z, screenMaterial('#1f6b3a', { opacity: 0.62 }));
    addIconPlane(group, style.icon, { x: body.x + body.width - 34, y: body.y + 58, width: 26, height: 26 }, z + 0.3, style.accent, { opacity: 0.58 });
  }
};

const addMeasuredDistrictSurfaceHighlights = (group, key, target, style, z) => {
  const { body, portal } = target;
  const columns = key === 'food' ? 5 : key === 'lab' ? 3 : 4;
  const rows = key === 'lab' ? 5 : 4;
  const dark = key === 'food' ? '#5a2309' : key === 'clinic' ? '#5a1520' : key === 'garage' ? '#071f46' : key === 'lab' ? '#261052' : '#123d25';
  const trim = screenMaterial('#f7fbff', { depthTest: false, depthWrite: false, opacity: 0.18 });
  const shadow = screenMaterial(dark, { depthTest: false, depthWrite: false, opacity: 0.24 });
  const glass = screenMaterial('#dff8ff', { depthTest: false, depthWrite: false, opacity: key === 'garage' ? 0.24 : 0.22 });
  const glow = screenMaterial(style.accent, { depthTest: false, depthWrite: false, opacity: 0.15 });

  for (let row = 1; row <= rows; row += 1) {
    const y = body.y + body.height * (0.16 + row * 0.14);
    addScreenRect(
      group,
      { x: body.x + body.width * 0.1, y, width: body.width * 0.76, height: 2 },
      z,
      row % 2 ? trim : shadow,
      { renderOrder: 94 }
    );
  }

  for (let col = 0; col < columns; col += 1) {
    for (let row = 0; row < rows; row += 1) {
      if ((row + col + (key === 'food' ? 1 : 0)) % 4 === 0) continue;
      const w = Math.max(5, body.width * 0.055);
      const h = Math.max(5, body.height * 0.06);
      const x = body.x + body.width * (0.18 + (col * 0.64) / Math.max(1, columns - 1)) - w / 2;
      const y = body.y + body.height * (0.2 + (row * 0.46) / Math.max(1, rows - 1));
      const cx = x + w / 2;
      const cy = y + h / 2;
      const insidePortal =
        cx > portal.x - 6 && cx < portal.x + portal.width + 6 && cy > portal.y - 10 && cy < portal.y + portal.height + 10;
      if (insidePortal) continue;
      addScreenRect(group, { x, y, width: w, height: h }, z + 0.2, glass, { renderOrder: 95 });
      if ((row + col) % 3 === 1) addScreenRect(group, { x, y, width: w, height: 1.7 }, z + 0.3, glow, { renderOrder: 95 });
    }
  }

  addScreenRect(group, { x: body.x + body.width * 0.12, y: body.y + 8, width: body.width * 0.5, height: 3 }, z + 0.4, trim, {
    renderOrder: 95,
  });
  addScreenRect(group, { x: body.x + body.width * 0.08, y: body.y + body.height - 13, width: body.width * 0.78, height: 4 }, z + 0.4, shadow, {
    renderOrder: 95,
  });
};

const addMeasuredDistrictForegroundDetails = (group, key, target, style, z) => {
  const { body, full, portal, roof, sign } = target;
  const trimMat = screenMaterial('#f7fbff', { opacity: 0.38 });
  const darkMat = screenMaterial('#061522', { opacity: 0.42 });
  const accentMat = screenMaterial(style.accent, { opacity: 0.42 });
  const rows = key === 'lab' ? 5 : 4;
  const columns = key === 'food' ? 5 : 4;

  addScreenRect(group, { x: roof.x + 4, y: roof.y + roof.height - 5, width: roof.width - 8, height: 4 }, z, darkMat);
  addScreenRect(group, { x: sign.x + 2, y: sign.y + sign.height - 4, width: sign.width - 4, height: 3 }, z + 0.1, darkMat);

  [0.16, 0.84].forEach((portion) => {
    addScreenRect(
      group,
      { x: body.x + body.width * portion - 2, y: body.y + 14, width: 4, height: body.height - 30 },
      z + 0.2,
      screenMaterial(style.dark, { opacity: 0.56 })
    );
  });

  for (let row = 1; row < rows; row += 1) {
    addScreenRect(
      group,
      {
        x: body.x + body.width * 0.1,
        y: body.y + body.height * (0.18 + row * 0.13),
        width: body.width * 0.78,
        height: 2,
      },
      z + 0.3,
      trimMat
    );
  }

  addMeasuredWindows(group, body, z + 0.5, style.accent, columns, rows);
  addScreenRect(
    group,
    { x: portal.x - 4, y: portal.y + portal.height * 0.82, width: portal.width + 8, height: 4 },
    z + 0.8,
    screenMaterial('#f7fbff', { opacity: 0.34 })
  );
  addScreenRect(
    group,
    { x: portal.x + portal.width * 0.18, y: portal.y + portal.height * 0.5, width: portal.width * 0.64, height: 3 },
    z + 0.9,
    accentMat
  );

  if (key === 'gym') {
    addScreenRect(group, { x: full.x + 10, y: body.y + 25, width: 39, height: body.height * 0.72 }, z + 1, screenMaterial('#5f6970', { opacity: 0.92 }));
    addScreenPolygon(
      group,
      [
        [full.x + 10, body.y + 25],
        [full.x + 50, body.y + 12],
        [full.x + 70, body.y + 26],
        [full.x + 28, body.y + 39],
      ],
      z + 1.2,
      screenMaterial(style.roof, { opacity: 0.94 })
    );
    addScreenRect(group, { x: body.x + body.width - 42, y: body.y + 32, width: 36, height: body.height * 0.48 }, z + 1.4, screenMaterial('#2b7a43', { opacity: 0.82 }));
  } else if (key === 'food') {
    [0, 1, 2, 3].forEach((level) => {
      const y = full.y + 30 + level * 22;
      addScreenRect(
        group,
        { x: full.x + 4, y, width: 54, height: 18 },
        z + 1.45 + level * 0.05,
        screenMaterial(level % 2 ? '#d86418' : '#f08a25', { opacity: 0.92 })
      );
      addScreenRect(
        group,
        { x: full.x + 9, y: y + 4, width: 47, height: 4 },
        z + 1.55 + level * 0.05,
        screenMaterial('#ffbd55', { opacity: 0.58 })
      );
      addScreenRect(
        group,
        { x: full.x + 4, y: y + 15, width: 54, height: 5 },
        z + 1.6 + level * 0.05,
        screenMaterial('#6b2a0c', { opacity: 0.5 })
      );
    });
    addScreenPolygon(
      group,
      [
        [full.x + 4, full.y + 25],
        [full.x + 62, full.y + 18],
        [full.x + 78, full.y + 33],
        [full.x + 20, full.y + 42],
      ],
      z + 1.85,
      screenMaterial('#ffce7a', { opacity: 0.9 })
    );
    [0.18, 0.5, 0.82].forEach((portion, index) => {
      addScreenRect(
        group,
        { x: body.x + body.width * portion - 22, y: body.y + body.height - 62 + index, width: 44, height: 9 },
        z + 1,
        screenMaterial(index === 1 ? style.roof : style.accent, { opacity: 0.92 })
      );
      addScreenRect(
        group,
        { x: body.x + body.width * portion - 15, y: body.y + body.height - 49, width: 30, height: 34 },
        z + 1.1,
        screenMaterial('#6b2a0c', { opacity: 0.56 })
      );
    });
    addScreenRect(
      group,
      { x: body.x + body.width - 38, y: body.y + body.height - 72, width: 46, height: 12 },
      z + 1.9,
      screenMaterial('#ffb244', { opacity: 0.88 })
    );
    addScreenRect(
      group,
      { x: body.x + body.width - 35, y: body.y + body.height - 59, width: 32, height: 36 },
      z + 1.95,
      screenMaterial('#7a300e', { opacity: 0.54 })
    );
  } else if (key === 'lab') {
    addScreenRect(
      group,
      { x: body.x - 6, y: body.y + 27, width: 24, height: body.height * 0.68 },
      z + 1.35,
      screenMaterial('#2a1558', { opacity: 0.72 })
    );
    addScreenRect(
      group,
      { x: body.x + body.width - 19, y: body.y + 25, width: 23, height: body.height * 0.72 },
      z + 1.35,
      screenMaterial('#26124f', { opacity: 0.7 })
    );
    addScreenRect(
      group,
      { x: body.x + body.width * 0.26, y: body.y - 22, width: body.width * 0.5, height: 15 },
      z + 1.55,
      screenMaterial('#2b155d', { opacity: 0.84 })
    );
    addScreenRect(
      group,
      { x: body.x + body.width * 0.34, y: body.y - 26, width: body.width * 0.34, height: 5 },
      z + 1.75,
      screenMaterial('#efddff', { opacity: 0.82 })
    );
    [
      [body.x + 12, body.y + 48],
      [body.x + body.width - 22, body.y + 52],
      [body.x + 18, body.y + 78],
      [body.x + body.width - 25, body.y + 84],
    ].forEach(([x, y], index) => {
      addScreenRect(group, { x, y, width: 7, height: 11 }, z + 1.9, screenMaterial(index % 2 ? '#bff8ff' : '#b6ff6b', { opacity: 0.66 }));
    });
    [-0.36, 0.36].forEach((offset) => {
      addScreenRect(
        group,
        { x: body.x + body.width * (0.5 + offset) - 6, y: body.y + 24, width: 12, height: body.height * 0.58 },
        z + 1,
        screenMaterial('#bff8ff', { opacity: 0.58 })
      );
      addScreenEllipse(
        group,
        { x: body.x + body.width * (0.5 + offset) - 7, y: body.y + 18, width: 14, height: 8 },
        z + 1.2,
        screenMaterial(style.accent, { opacity: 0.66 })
      );
    });
  } else if (key === 'clinic') {
    addScreenRect(group, { x: body.x + body.width - 35, y: body.y + 12, width: 32, height: body.height * 0.74 }, z + 1, screenMaterial('#7c1f2b', { opacity: 0.7 }));
    addScreenRect(group, { x: body.x + body.width * 0.62, y: body.y - 27, width: 9, height: 43 }, z + 1.2, screenMaterial('#f7fbff', { opacity: 0.92 }));
    addScreenRect(group, { x: body.x + body.width * 0.52, y: body.y - 11, width: 42, height: 9 }, z + 1.3, screenMaterial('#f7fbff', { opacity: 0.92 }));
  } else if (key === 'garage') {
    addScreenRect(group, { x: body.x + 12, y: body.y + body.height - 47, width: body.width - 24, height: 36 }, z + 1, screenMaterial('#0a1f36', { opacity: 0.72 }));
    for (let line = 0; line < 5; line += 1) {
      addScreenRect(group, { x: body.x + 20, y: body.y + body.height - 42 + line * 6, width: body.width - 40, height: 2 }, z + 1.2, screenMaterial('#d8f7ff', { opacity: 0.3 }));
    }
    addScreenRect(group, { x: body.x + 8, y: body.y + 22, width: 8, height: body.height * 0.62 }, z + 1.1, screenMaterial('#8edfff', { opacity: 0.28 }));
  }
};

const addMeasuredDistrictSilhouetteBreakup = (group, key, target, style, z) => {
  const { body, full, portal, roof } = target;
  const dark = style.dark;
  const roofLight = key === 'food' ? '#ffe3a2' : key === 'clinic' ? '#fff7ee' : key === 'garage' ? '#dff8ff' : style.roof;
  const footGlow = screenMaterial(style.accent, { opacity: 0.16 });

  addScreenPolygon(
    group,
    [
      [portal.x - portal.width * 0.4, portal.y + portal.height * 0.72],
      [portal.x + portal.width * 1.4, portal.y + portal.height * 0.72],
      [portal.x + portal.width * 1.85, full.y + full.height - 6],
      [portal.x - portal.width * 0.85, full.y + full.height - 4],
    ],
    z,
    footGlow
  );

  addScreenPolygon(
    group,
    [
      [roof.x + 2, roof.y + roof.height * 0.82],
      [roof.x + roof.width * 0.18, roof.y + 3],
      [roof.x + roof.width * 0.88, roof.y],
      [roof.x + roof.width - 2, roof.y + roof.height * 0.82],
      [roof.x + roof.width * 0.76, roof.y + roof.height + 6],
      [roof.x + roof.width * 0.14, roof.y + roof.height + 4],
    ],
    z + 0.25,
    screenMaterial(roofLight, { opacity: 0.58 })
  );
  addScreenPolygon(
    group,
    [
      [roof.x + roof.width * 0.74, roof.y + 4],
      [roof.x + roof.width - 1, roof.y + roof.height * 0.82],
      [roof.x + roof.width * 0.78, roof.y + roof.height + 6],
      [roof.x + roof.width * 0.62, roof.y + 8],
    ],
    z + 0.35,
    screenMaterial(dark, { opacity: 0.28 })
  );

  if (key === 'gym') {
    addScreenPolygon(
      group,
      [
        [full.x + 8, body.y + 43],
        [full.x + 47, body.y + 30],
        [full.x + 48, body.y + body.height - 8],
        [full.x + 8, body.y + body.height + 2],
      ],
      z + 0.6,
      screenMaterial('#606a73', { opacity: 0.78 })
    );
    addScreenPolygon(
      group,
      [
        [full.x + 10, body.y + 31],
        [full.x + 54, body.y + 15],
        [full.x + 70, body.y + 30],
        [full.x + 28, body.y + 43],
      ],
      z + 0.8,
      screenMaterial('#edf5de', { opacity: 0.84 })
    );
    addScreenPolygon(
      group,
      [
        [body.x + body.width - 48, body.y + 46],
        [body.x + body.width - 4, body.y + 38],
        [body.x + body.width - 4, body.y + body.height - 24],
        [body.x + body.width - 48, body.y + body.height - 14],
      ],
      z + 0.9,
      screenMaterial('#2f8e4d', { opacity: 0.64 })
    );
  } else if (key === 'food') {
    [0, 1, 2, 3].forEach((level) => {
      const y = body.y + 13 + level * 22;
      addScreenPolygon(
        group,
        [
          [body.x + 2, y],
          [body.x + 54, y - 7],
          [body.x + 63, y + 8],
          [body.x + 12, y + 18],
        ],
        z + 0.55 + level * 0.05,
        screenMaterial(level % 2 ? '#c95c18' : '#f18a27', { opacity: 0.72 })
      );
    });
    addScreenPolygon(
      group,
      [
        [body.x + body.width * 0.64, body.y + 25],
        [body.x + body.width - 6, body.y + 31],
        [body.x + body.width - 6, body.y + body.height - 20],
        [body.x + body.width * 0.64, body.y + body.height - 12],
      ],
      z + 0.8,
      screenMaterial('#6f2e0d', { opacity: 0.5 })
    );
  } else if (key === 'lab') {
    addScreenPolygon(
      group,
      [
        [body.x + body.width * 0.28, body.y + 8],
        [body.x + body.width * 0.76, body.y + 14],
        [body.x + body.width * 0.76, body.y + body.height - 12],
        [body.x + body.width * 0.28, body.y + body.height - 4],
      ],
      z + 0.75,
      screenMaterial('#9657ef', { opacity: 0.48 })
    );
    addScreenRect(group, { x: body.x - 4, y: body.y + 38, width: 20, height: body.height * 0.58 }, z + 0.9, screenMaterial('#2a1558', { opacity: 0.58 }));
    addScreenRect(group, { x: body.x + body.width - 17, y: body.y + 35, width: 20, height: body.height * 0.62 }, z + 0.9, screenMaterial('#291355', { opacity: 0.56 }));
  } else if (key === 'clinic') {
    addScreenPolygon(
      group,
      [
        [body.x + body.width * 0.68, body.y + 24],
        [body.x + body.width - 4, body.y + 31],
        [body.x + body.width - 4, body.y + body.height - 15],
        [body.x + body.width * 0.68, body.y + body.height - 6],
      ],
      z + 0.75,
      screenMaterial('#7b1f2a', { opacity: 0.56 })
    );
    addScreenRect(group, { x: body.x + body.width * 0.61, y: body.y - 24, width: 8, height: 40 }, z + 1, screenMaterial('#f7fbff', { opacity: 0.86 }));
    addScreenRect(group, { x: body.x + body.width * 0.52, y: body.y - 9, width: 40, height: 8 }, z + 1.1, screenMaterial('#f7fbff', { opacity: 0.86 }));
  } else if (key === 'garage') {
    addScreenPolygon(
      group,
      [
        [body.x + body.width * 0.68, body.y + 24],
        [full.x + full.width - 9, body.y + 36],
        [full.x + full.width - 10, body.y + body.height - 10],
        [body.x + body.width * 0.68, body.y + body.height - 2],
      ],
      z + 0.75,
      screenMaterial('#0d2d61', { opacity: 0.58 })
    );
    addScreenRect(group, { x: body.x + 16, y: body.y + body.height - 48, width: body.width - 34, height: 33 }, z + 1, screenMaterial('#071523', { opacity: 0.64 }));
    for (let line = 0; line < 4; line += 1) {
      addScreenRect(group, { x: body.x + 24, y: body.y + body.height - 42 + line * 6, width: body.width - 50, height: 2 }, z + 1.15, screenMaterial('#d8f7ff', { opacity: 0.26 }));
    }
  }
};

const addMeasuredDistrictIconBadge = (group, key, target, style, z) => {
  const { portal } = target;
  const sizeByKey = {
    clinic: [38, 38],
    food: [42, 36],
    garage: [44, 44],
    gym: [44, 34],
    lab: [36, 36],
  };
  const [width, height] = sizeByKey[key] || [38, 38];
  const yOffsetByKey = {
    clinic: 30,
    food: 28,
    garage: 31,
    gym: 27,
    lab: 33,
  };
  const xOffsetByKey = {
    garage: -44,
  };
  const badge = {
    x: portal.x + portal.width / 2 - width / 2 + (xOffsetByKey[key] || 0),
    y: portal.y - yOffsetByKey[key],
    width,
    height,
  };
  addScreenEllipse(group, badge, z, screenMaterial(key === 'food' ? '#9a4215' : style.dark, { opacity: 0.98 }));
  addScreenEllipse(
    group,
    { x: badge.x + 3, y: badge.y + 3, width: badge.width - 6, height: badge.height - 6 },
    z + 0.1,
    screenMaterial(style.accent, { opacity: 0.35 })
  );
  addIconPlane(
    group,
    style.icon,
    { x: badge.x + badge.width * 0.16, y: badge.y + badge.height * 0.14, width: badge.width * 0.68, height: badge.height * 0.72 },
    z + 0.2,
    style.accent,
    { opacity: 1 }
  );
};

const addMeasuredDistrict = (world, landmarks, key) => {
  const target = plazaReferenceSpec.landmarks[key];
  const style = DISTRICT_SCREEN_DATA[key];
  const group = new THREE.Group();
  group.name = `measured-district-${key}`;
  const full = target.full;
  const body = target.body;
  const z = 52;

  addScreenEllipse(
    group,
    { x: full.x + 8, y: full.y + full.height - 34, width: full.width - 16, height: 48 },
    z - 5,
    screenMaterial('#1a2630', { opacity: 0.34 })
  );
  addScreenRect(group, { x: full.x + 5, y: full.y + full.height - 24, width: full.width - 10, height: 20 }, z, screenMaterial(style.dark));
  const yawByDistrict = { clinic: -8, food: 4, garage: -10, gym: 8, lab: 0 };
  addScreenBox3D(
    group,
    { x: body.x + body.width * 0.05, y: body.y + body.height * 0.05, width: body.width * 0.9, height: body.height * 0.84 },
    z + 2,
    24,
    { front: style.base, side: style.dark, top: style.roof },
    { opacity: 1, pitchDegrees: -2, yawDegrees: yawByDistrict[key] || 0 }
  );
  addScreenBox3D(
    group,
    { x: target.roof.x + target.roof.width * 0.08, y: target.roof.y + 4, width: target.roof.width * 0.84, height: target.roof.height * 0.44 },
    z + 7,
    18,
    { front: style.roof, side: style.dark, top: '#ffffff' },
    { opacity: 1, pitchDegrees: -6, yawDegrees: yawByDistrict[key] || 0 }
  );
  addScreenRect(group, body, z + 1, textureMaterial(createPanelTexture(style.base, style.dark, style.accent), { opacity: 0.44 }));
  addScreenRect(group, { x: body.x, y: body.y, width: body.width, height: 12 }, z + 2, screenMaterial('#f7fbff', { opacity: 0.16 }));
  addScreenRect(
    group,
    { x: body.x, y: body.y + body.height - 16, width: body.width, height: 16 },
    z + 2,
    screenMaterial(style.dark, { opacity: 0.38 })
  );
  addScreenRect(group, { x: body.x + 6, y: body.y + 12, width: 7, height: body.height - 28 }, z + 3, screenMaterial('#f7fbff', { opacity: 0.14 }));
  addScreenPolygon(
    group,
    [
      [body.x + body.width, body.y + 10],
      [full.x + full.width - 5, body.y + 22],
      [full.x + full.width - 6, body.y + body.height - 10],
      [body.x + body.width, body.y + body.height],
    ],
    z + 0.5,
    screenMaterial(style.dark, { opacity: 0.82 })
  );
  addScreenRect(
    group,
    { x: full.x + 4, y: body.y + 6, width: body.width * 0.2, height: body.height * 0.86 },
    z + 2,
    screenMaterial(style.dark)
  );
  addScreenRect(
    group,
    { x: full.x + full.width - body.width * 0.24 - 4, y: body.y + 12, width: body.width * 0.22, height: body.height * 0.78 },
    z + 2,
    screenMaterial(style.dark)
  );
  addScreenRect(group, target.roof, z + 4, screenMaterial(style.roof));
  addScreenPolygon(
    group,
    [
      [target.roof.x, target.roof.y + target.roof.height],
      [target.roof.x + target.roof.width * 0.15, target.roof.y + 2],
      [target.roof.x + target.roof.width * 0.9, target.roof.y],
      [target.roof.x + target.roof.width, target.roof.y + target.roof.height],
    ],
    z + 5,
    screenMaterial(style.roof)
  );

  addMeasuredDistrictMassing(group, key, target, style, z);

  addScreenRect(group, target.sign, z + 8, textureMaterial(createDistrictSignTexture(key, style, target.sign)));

  addMeasuredWindows(group, body, z + 5, style.accent, key === 'food' ? 5 : 4, key === 'lab' ? 5 : 4);

  const portal = target.portal;
  addScreenEllipse(
    group,
    { x: portal.x - 8, y: portal.y - 8, width: portal.width + 16, height: portal.height + 16 },
    z + 6,
    screenMaterial(style.accent, { opacity: 0.12 })
  );
  addScreenRect(
    group,
    { x: portal.x - 12, y: portal.y - 12, width: portal.width + 24, height: portal.height + 24 },
    z + 10,
    textureMaterial(createPortalTexture(style.icon, style.accent))
  );

  if (key === 'food') {
    [-0.32, 0, 0.32].forEach((offset, index) => {
      addScreenRect(
        group,
        {
          x: body.x + body.width * (0.5 + offset) - body.width * 0.12,
          y: body.y - 6 + index,
          width: body.width * 0.24,
          height: 11,
        },
        z + 8,
        screenMaterial(index % 2 ? style.roof : style.accent)
      );
    });
    [-0.38, 0.38].forEach((offset) => {
      addScreenRect(
        group,
        { x: body.x + body.width * (0.5 + offset) - 12, y: body.y + body.height - 54, width: 24, height: 45 },
        z + 8,
        screenMaterial(style.dark, { opacity: 0.72 })
      );
      addScreenRect(
        group,
        { x: body.x + body.width * (0.5 + offset) - 16, y: body.y + body.height - 61, width: 32, height: 9 },
        z + 9,
        screenMaterial(style.roof, { opacity: 0.92 })
      );
    });
  }
  if (key === 'lab') {
    [-0.35, 0.36].forEach((offset) => {
      addScreenRect(
        group,
        { x: body.x + body.width * (0.5 + offset) - 4, y: body.y + body.height * 0.18, width: 8, height: body.height * 0.55 },
        z + 8,
        screenMaterial('#bff8ff', { opacity: 0.7 })
      );
    });
    addScreenRect(group, { x: body.x + body.width * 0.3, y: body.y - 26, width: body.width * 0.4, height: 22 }, z + 9, screenMaterial(style.dark));
    addScreenRect(group, { x: body.x + body.width * 0.36, y: body.y - 31, width: body.width * 0.28, height: 6 }, z + 10, screenMaterial(style.roof));
  }
  if (key === 'gym') {
    addScreenRect(group, { x: full.x + 8, y: body.y + 16, width: 34, height: body.height * 0.82 }, z + 8, screenMaterial('#5f6970'));
    addScreenRect(group, { x: full.x + 16, y: body.y - 6, width: 52, height: 24 }, z + 9, screenMaterial(style.roof));
    addScreenRect(group, { x: body.x + body.width - 42, y: body.y + 33, width: 38, height: body.height * 0.48 }, z + 8, screenMaterial('#2d7743'));
  }
  if (key === 'clinic') {
    addScreenRect(group, { x: body.x + body.width - 34, y: body.y + 13, width: 31, height: body.height * 0.72 }, z + 8, screenMaterial(style.dark, { opacity: 0.74 }));
    addScreenRect(group, { x: body.x + body.width * 0.58, y: body.y - 23, width: 28, height: 28 }, z + 9, screenMaterial('#f7fbff'));
    addScreenRect(group, { x: body.x + body.width * 0.58 + 10, y: body.y - 30, width: 8, height: 42 }, z + 10, screenMaterial('#f7fbff'));
  }
  if (key === 'garage') {
    addScreenRect(
      group,
      { x: portal.x + 1, y: portal.y + portal.height * 0.48, width: portal.width - 2, height: portal.height * 0.3 },
      z + 11,
      screenMaterial('#0c1d32', { opacity: 0.82 })
    );
    addScreenRect(group, { x: body.x + 8, y: body.y + body.height - 45, width: body.width - 16, height: 36 }, z + 9, screenMaterial('#0c1d32', { opacity: 0.62 }));
    [-0.34, 0.34].forEach((offset) => {
      addScreenEllipse(
        group,
        { x: body.x + body.width * (0.5 + offset) - 10, y: body.y + body.height - 37, width: 20, height: 20 },
        z + 11,
        screenMaterial('#0b1019', { opacity: 0.88 })
      );
    });
  }

  addScreenRect(group, full, z + 5.2, textureMaterial(createMeasuredDistrictTexture(key, target, style), { alphaTest: 0.01, depthWrite: true, opacity: 1 }));
  addScreenRect(group, full, z + 6.2, textureMaterial(createDistrictReferenceOverlayTexture(key, target, style), { opacity: 0.9 }));
  addMeasuredDistrictDepthAccents(group, target, style, z + 26);
  addScreenRect(group, full, z + 26.65, textureMaterial(createDistrictReferenceOverlayTexture(key, target, style), { opacity: 0.34 }));
  addMeasuredDistrictSpecificDetails(group, key, target, style, z + 27);
  addMeasuredDistrictForegroundDetails(group, key, target, style, z + 27.35);
  addMeasuredDistrictSilhouetteBreakup(group, key, target, style, z + 27.15);
  if (DISTRICT_BODY_GLAZE[key]) {
    addScreenRect(
      group,
      body,
      z + 41,
      screenMaterial(DISTRICT_BODY_GLAZE[key].color, {
        depthTest: false,
        depthWrite: false,
        opacity: DISTRICT_BODY_GLAZE[key].opacity,
      }),
      { renderOrder: 92 }
    );
  }
  addMeasuredDistrictSurfaceHighlights(group, key, target, style, z + 42);
  addScreenBoxOutline(group, body, z + 27.2, '#061522', 2, 0.32);
  addScreenRect(group, target.sign, z + 28, textureMaterial(createDistrictSignTexture(key, style, target.sign), { opacity: 1 }), {
    renderOrder: 98,
  });
  addScreenBoxOutline(group, target.sign, z + 30, '#061522', 2, 0.82);
  addMeasuredDistrictIconBadge(group, key, target, style, 96);
  addScreenRect(
    group,
    { x: portal.x - 12, y: portal.y - 12, width: portal.width + 24, height: portal.height + 24 },
    z + 29,
    textureMaterial(createPortalTexture(style.icon, style.accent), { opacity: DISTRICT_PORTAL_OPACITY[key] ?? 1 }),
    { renderOrder: 99 }
  );
  addScreenRect(
    group,
    full,
    z + 51.3,
    textureMaterial(createDistrictReferenceOverlayTexture(key, target, style), { opacity: 0.18 }),
    { renderOrder: 105 }
  );
  addScreenRect(
    group,
    full,
    z + 51.6,
    textureMaterial(createDistrictTraceIllustrationTexture(key, target, style), { opacity: 0.13 }),
    { renderOrder: 106 }
  );
  addScreenRect(
    group,
    full,
    z + 52,
    textureMaterial(createDistrictOcclusionTexture(key, target, style), { alphaTest: 0.01, depthWrite: true, opacity: 1 }),
    { renderOrder: 106.8 }
  );
  addScreenRect(
    group,
    full,
    z + 52.08,
    textureMaterial(createMeasuredDistrictTexture(key, target, style), { alphaTest: 0.01, opacity: 0.72 }),
    { renderOrder: 107 }
  );
  const generatedFacadeTexture = getGeneratedDistrictFacadeTexture(key);
  const generatedFacadeBox = fitTextureAlphaBoundsToBox(full, GENERATED_DISTRICT_FACADE_ALPHA_BOUNDS[key]);
  addScreenRect(group, full, z + 53, textureMaterial(createDistrictMicroDetailTexture(key, target, style), { opacity: 0.14 }), {
    renderOrder: 108,
  });
  if (generatedFacadeTexture) {
    addScreenRect(group, generatedFacadeBox, z + 53.08, textureMaterial(generatedFacadeTexture, { alphaTest: 0.01, opacity: 1 }), {
      renderOrder: 109,
    });
  }
  addScreenRect(
    group,
    body,
    z + 53.12,
    screenMaterial('#071523', {
      depthTest: false,
      depthWrite: false,
      opacity: 0.0,
    }),
    { renderOrder: 109.5 }
  );
  if (DISTRICT_BODY_COLOR_CORRECTION[key]) {
    addScreenRect(
      group,
      body,
      z + 53.13,
      screenMaterial(DISTRICT_BODY_COLOR_CORRECTION[key].color, {
        depthTest: false,
        depthWrite: false,
        opacity: DISTRICT_BODY_COLOR_CORRECTION[key].opacity,
      }),
      { renderOrder: 109.6 }
    );
  }
  if (DISTRICT_BODY_LIGHT_CORRECTION[key]) {
    addScreenRect(
      group,
      body,
      z + 53.132,
      screenMaterial(DISTRICT_BODY_LIGHT_CORRECTION[key].color, {
        depthTest: false,
        depthWrite: false,
        opacity: DISTRICT_BODY_LIGHT_CORRECTION[key].opacity,
      }),
      { renderOrder: 109.65 }
    );
  }
  if (DISTRICT_BODY_BALANCE_CORRECTION[key]) {
    addScreenRect(
      group,
      body,
      z + 53.133,
      screenMaterial(DISTRICT_BODY_BALANCE_CORRECTION[key].color, {
        depthTest: false,
        depthWrite: false,
        opacity: DISTRICT_BODY_BALANCE_CORRECTION[key].opacity,
      }),
      { renderOrder: 109.66 }
    );
  }
  if (DISTRICT_ROOF_COLOR_CORRECTION[key]) {
    addScreenRect(
      group,
      target.roof,
      z + 53.135,
      screenMaterial(DISTRICT_ROOF_COLOR_CORRECTION[key].color, {
        depthTest: false,
        depthWrite: false,
        opacity: DISTRICT_ROOF_COLOR_CORRECTION[key].opacity,
      }),
      { renderOrder: 109.7 }
    );
  }
  if (DISTRICT_ROOF_BALANCE_CORRECTION[key]) {
    addScreenRect(
      group,
      target.roof,
      z + 53.136,
      screenMaterial(DISTRICT_ROOF_BALANCE_CORRECTION[key].color, {
        depthTest: false,
        depthWrite: false,
        opacity: DISTRICT_ROOF_BALANCE_CORRECTION[key].opacity,
      }),
      { renderOrder: 109.72 }
    );
  }
  if (generatedFacadeTexture) {
    addScreenRect(
      group,
      generatedFacadeBox,
      z + 53.138,
      textureMaterial(generatedFacadeTexture, { alphaTest: 0.01, opacity: DISTRICT_FINAL_FACADE_DECAL_OPACITY[key] ?? 0.18 }),
      {
      renderOrder: 109.74,
      }
    );
  }
  if (DISTRICT_PORTAL_COLOR_CORRECTION[key]) {
    addScreenEllipse(
      group,
      {
        x: portal.x - portal.width * 0.14,
        y: portal.y - portal.height * 0.1,
        width: portal.width * 1.28,
        height: portal.height * 1.12,
      },
      z + 53.145,
      screenMaterial(DISTRICT_PORTAL_COLOR_CORRECTION[key].color, {
        depthTest: false,
        depthWrite: false,
        opacity: DISTRICT_PORTAL_COLOR_CORRECTION[key].opacity,
      }),
      { renderOrder: 109.75 }
    );
    addScreenEllipse(
      group,
      {
        x: portal.x + portal.width * 0.08,
        y: portal.y + portal.height * 0.08,
        width: portal.width * 0.84,
        height: portal.height * 0.84,
      },
      z + 53.15,
      screenMaterial('#fff6df', {
        depthTest: false,
        depthWrite: false,
        opacity: DISTRICT_PORTAL_COLOR_CORRECTION[key].opacity * 0.34,
      }),
      { renderOrder: 109.8 }
    );
  }
  addScreenRect(group, full, z + 53.14, textureMaterial(createDistrictTraceIllustrationTexture(key, target, style), { opacity: 0.46 }), {
    renderOrder: 110,
  });
  addScreenRect(group, target.sign, z + 53.24, textureMaterial(createDistrictSignTexture(key, style, target.sign), { opacity: 0.98 }), {
    renderOrder: 111,
  });
  if (DISTRICT_SIGN_COLOR_CORRECTION[key]) {
    addScreenRect(
      group,
      target.sign,
      z + 53.26,
      screenMaterial(DISTRICT_SIGN_COLOR_CORRECTION[key].color, {
        depthTest: false,
        depthWrite: false,
        opacity: DISTRICT_SIGN_COLOR_CORRECTION[key].opacity,
      }),
      { renderOrder: 111.2 }
    );
  }
  if (DISTRICT_SIGN_LIGHT_CORRECTION[key]) {
    addScreenRect(
      group,
      target.sign,
      z + 53.27,
      screenMaterial(DISTRICT_SIGN_LIGHT_CORRECTION[key].color, {
        depthTest: false,
        depthWrite: false,
        opacity: DISTRICT_SIGN_LIGHT_CORRECTION[key].opacity,
      }),
      { renderOrder: 111.3 }
    );
  }

  world.add(group);
  landmarks[key] = group;
  return group;
};

const DISTRICT_MODEL_OVERLAY = {
  gym: { bottomInset: 13, depthScale: 0.48, scale: 3.62, x: -6, yaw: 11, z: 100 },
  food: { bottomInset: 11, depthScale: 0.48, scale: 3.42, x: -2, yaw: 6, z: 100 },
  lab: { bottomInset: 9, depthScale: 0.48, scale: 3.32, x: 0, yaw: 0, z: 100 },
  clinic: { bottomInset: 10, depthScale: 0.48, scale: 3.36, x: 0, yaw: -8, z: 100 },
  garage: { bottomInset: 12, depthScale: 0.48, scale: 3.38, x: 2, yaw: -11, z: 100 },
};

const addMeasuredDistrictModelOverlay = (world, key) => {
  const target = plazaReferenceSpec.landmarks[key];
  const config = DISTRICT_MODEL_OVERLAY[key];
  if (!target || !config) return null;

  const model = createDistrictModel3D({ key, ...DISTRICT_3D_DATA[key] }, { scale: config.scale });
  model.name = `measured-geometry-district-${key}`;
  model.scale.z = config.scale * config.depthScale;
  model.position.set(
    screenX(target.full.x + target.full.width / 2 + config.x),
    screenY(target.full.y + target.full.height - config.bottomInset),
    config.z
  );
  model.rotation.y = (config.yaw * Math.PI) / 180;
  model.traverse((child) => {
    if (child.isMesh || child.isSprite) {
          child.renderOrder = 0;
      if (child.isSprite) child.visible = false;
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          material.transparent = true;
          material.opacity = Math.min(material.opacity ?? 1, 0.6);
          material.depthWrite = false;
          material.needsUpdate = true;
        });
      }
    }
  });
  world.add(model);
  return model;
};

const addMeasuredCrosswalk = (world, crosswalk) => {
  const stripeCount = Math.max(5, Math.floor(crosswalk.box.width / 12));
  for (let index = 0; index < stripeCount; index += 1) {
    const stripeW = crosswalk.box.width / (stripeCount * 1.8);
    addScreenRect(
      world,
      {
        x: crosswalk.box.x + index * (crosswalk.box.width / stripeCount),
        y: crosswalk.box.y + crosswalk.box.height * 0.14,
        width: stripeW,
        height: crosswalk.box.height * 0.72,
      },
      36,
      screenMaterial('#f7fbff', { opacity: 0.92 }),
      { angleDegrees: crosswalk.angleDegrees }
    );
  }
};

const addMeasuredRoadLine = (world, polyline, width, z, color, options = {}) => {
  const sampled = sampleScreenPolyline(polyline, options.divisions || 90);
  const mesh = new THREE.Mesh(
    createScreenRibbonGeometry(sampled, width),
    screenMaterial(color, {
      depthTest: options.depthTest,
      depthWrite: options.depthWrite,
      opacity: options.opacity ?? 0.9,
    })
  );
  mesh.position.z = z;
  mesh.renderOrder = options.renderOrder || 0;
  world.add(mesh);
};

const addMeasuredDistrictCrispEdges = (world) => {
  DISTRICT_ORDER.forEach((key) => {
    const target = plazaReferenceSpec.landmarks[key];
    const style = DISTRICT_SCREEN_DATA[key];
    if (!target || !style) return;
    const { body, full, roof, sign, portal } = target;
    const dark = key === 'food' ? '#4e1d08' : key === 'clinic' ? '#4e111b' : key === 'garage' ? '#061a3d' : key === 'lab' ? '#1f0d48' : '#12351f';
    const z = 78.2;

    addMeasuredRoadLine(world, [[body.x + 3, body.y + 3], [body.x + body.width - 4, body.y + 2]], 2.4, z, '#f7fbff', { divisions: 8, opacity: 0.26 });
    addMeasuredRoadLine(world, [[body.x + 2, body.y + 8], [body.x + 2, body.y + body.height - 7]], 3.4, z + 0.1, dark, {
      divisions: 8,
      opacity: 0.48,
    });
    addMeasuredRoadLine(
      world,
      [[body.x + body.width - 3, body.y + 10], [full.x + full.width - 7, body.y + 24], [full.x + full.width - 8, body.y + body.height - 8]],
      3.6,
      z + 0.15,
      dark,
      { divisions: 16, opacity: 0.5 }
    );
    addMeasuredRoadLine(world, [[body.x + 8, body.y + body.height - 5], [body.x + body.width - 8, body.y + body.height - 5]], 3.2, z + 0.2, '#061522', {
      divisions: 8,
      opacity: 0.42,
    });
    addMeasuredRoadLine(
      world,
      [
        [roof.x + 2, roof.y + roof.height - 2],
        [roof.x + roof.width * 0.2, roof.y + 5],
        [roof.x + roof.width * 0.88, roof.y + 3],
        [roof.x + roof.width - 2, roof.y + roof.height - 1],
      ],
      2.2,
      z + 0.35,
      '#ffffff',
      { divisions: 18, opacity: 0.34 }
    );
    addMeasuredRoadLine(world, [[roof.x + 2, roof.y + roof.height - 1], [roof.x + roof.width - 3, roof.y + roof.height - 1]], 3.2, z + 0.45, dark, {
      divisions: 8,
      opacity: 0.42,
    });
    addScreenBoxOutline(world, sign, z + 0.55, '#061522', 2, 0.72);

    const portalFoot = portal.y + portal.height * 0.9;
    addMeasuredRoadLine(
      world,
      [[portal.x - 8, portalFoot], [portal.x + portal.width * 0.5, portalFoot + 4], [portal.x + portal.width + 10, portalFoot]],
      2.6,
      z + 0.6,
      style.accent,
      { divisions: 18, opacity: 0.46 }
    );
  });
};

const DISTRICT_TRACE_FACETS = {
  gym: [
    { color: '#5f6c73', opacity: 0.72, points: [[36, 284], [78, 264], [80, 368], [37, 384]] },
    { color: '#eaf4d7', opacity: 0.78, points: [[58, 221], [118, 204], [190, 219], [202, 240], [78, 255]] },
    { color: '#1b5b33', opacity: 0.46, points: [[188, 262], [224, 276], [220, 357], [189, 367]] },
    { color: '#f7fbff', opacity: 0.34, points: [[76, 257], [150, 246], [202, 257], [190, 263], [88, 266]] },
  ],
  food: [
    { color: '#c35a17', opacity: 0.56, points: [[218, 238], [269, 224], [270, 348], [220, 357]] },
    { color: '#ffb557', opacity: 0.42, points: [[220, 236], [270, 225], [270, 238], [220, 250]] },
    { color: '#6d2b0d', opacity: 0.54, points: [[350, 252], [381, 244], [379, 338], [350, 350]] },
    { color: '#ffe0a0', opacity: 0.58, points: [[224, 215], [301, 203], [354, 214], [361, 246], [224, 249]] },
  ],
  lab: [
    { color: '#2c1559', opacity: 0.58, points: [[390, 247], [408, 226], [407, 351], [390, 358]] },
    { color: '#27104f', opacity: 0.56, points: [[488, 222], [513, 234], [512, 345], [490, 355]] },
    { color: '#f1ddff', opacity: 0.5, points: [[409, 190], [485, 189], [503, 223], [397, 224]] },
    { color: '#bff8ff', opacity: 0.34, points: [[430, 231], [492, 226], [499, 245], [428, 250]] },
  ],
  clinic: [
    { color: '#7b1f2a', opacity: 0.58, points: [[814, 242], [852, 255], [850, 345], [815, 356]] },
    { color: '#fff6ed', opacity: 0.58, points: [[729, 213], [798, 204], [832, 219], [835, 248], [720, 251]] },
    { color: '#f1847c', opacity: 0.28, points: [[716, 247], [808, 240], [808, 255], [716, 264]] },
    { color: '#5c1420', opacity: 0.42, points: [[706, 284], [718, 258], [718, 348], [706, 356]] },
  ],
  garage: [
    { color: '#0d2f67', opacity: 0.62, points: [[1012, 251], [1045, 267], [1039, 366], [1011, 377]] },
    { color: '#dff6ff', opacity: 0.58, points: [[906, 220], [972, 207], [1020, 217], [1030, 252], [902, 254]] },
    { color: '#8edfff', opacity: 0.28, points: [[908, 254], [1008, 248], [1014, 262], [910, 270]] },
    { color: '#061a3d', opacity: 0.36, points: [[892, 284], [903, 257], [902, 370], [891, 383]] },
  ],
};

const DISTRICT_TRACE_LINES = {
  gym: [
    [[42, 282], [81, 265], [82, 369], [38, 384]],
    [[78, 256], [139, 247], [202, 256]],
  ],
  food: [
    [[219, 238], [270, 225], [270, 348], [220, 357]],
    [[350, 252], [381, 244], [379, 338], [350, 350]],
  ],
  lab: [
    [[390, 247], [408, 226], [488, 222], [513, 234]],
    [[407, 224], [397, 356], [512, 345], [488, 222]],
  ],
  clinic: [
    [[716, 247], [808, 240], [852, 255], [850, 345]],
    [[720, 251], [729, 213], [798, 204], [832, 219]],
  ],
  garage: [
    [[902, 254], [1008, 248], [1045, 267], [1039, 366]],
    [[906, 220], [972, 207], [1020, 217], [1030, 252]],
  ],
};

const addMeasuredDistrictSilhouetteTraceOverlay = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-district-silhouette-trace-overlay';
  const facetStrength = 0.24;
  const lineStrength = 0.42;
  DISTRICT_ORDER.forEach((key) => {
    const style = DISTRICT_SCREEN_DATA[key];
    (DISTRICT_TRACE_FACETS[key] || []).forEach((facet, index) => {
      addScreenPolygon(
        group,
        facet.points,
        92 + index * 0.05,
        screenMaterial(facet.color, {
          depthTest: false,
          depthWrite: false,
          opacity: facet.opacity * facetStrength,
        }),
        { renderOrder: 82 }
      );
    });
    (DISTRICT_TRACE_LINES[key] || []).forEach((line, index) => {
      addMeasuredRoadLine(group, line, index === 0 ? 2.2 : 1.8, 92.6 + index * 0.08, index === 0 ? '#061522' : '#f7fbff', {
        divisions: 18,
        opacity: (index === 0 ? 0.5 : 0.32) * lineStrength,
      });
    });
    const target = plazaReferenceSpec.landmarks[key];
    if (target?.roof) {
      addMeasuredRoadLine(
        group,
        [
          [target.roof.x + 4, target.roof.y + target.roof.height - 2],
          [target.roof.x + target.roof.width - 4, target.roof.y + target.roof.height - 2],
        ],
        2.6,
        92.9,
        style.dark,
        { divisions: 8, opacity: 0.4 * lineStrength }
      );
    }
  });
  world.add(group);
};

const addMeasuredDistrictFinalLinework = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-district-final-linework';
  const z = 113;

  DISTRICT_ORDER.forEach((key) => {
    const target = plazaReferenceSpec.landmarks[key];
    const style = DISTRICT_SCREEN_DATA[key];
    if (!target || !style) return;
    const { body, full, portal, roof, sign } = target;
    const dark =
      key === 'food'
        ? '#4b1b08'
        : key === 'clinic'
          ? '#4c1018'
          : key === 'garage'
            ? '#061a3d'
            : key === 'lab'
              ? '#1c0b43'
              : '#12351f';
    const light = key === 'food' ? '#ffe0a0' : key === 'lab' ? '#ead8ff' : key === 'garage' ? '#dff6ff' : '#f7fbff';

    addMeasuredRoadLine(
      group,
      [
        [body.x + 2, body.y + body.height - 3],
        [body.x + body.width - 5, body.y + body.height - 4],
      ],
      3,
      z,
      '#061522',
      { divisions: 8, opacity: 0.58 }
    );
    addMeasuredRoadLine(
      group,
      [
        [body.x + body.width - 4, body.y + 10],
        [full.x + full.width - 8, body.y + 24],
        [full.x + full.width - 8, body.y + body.height - 10],
      ],
      3.2,
      z + 0.1,
      dark,
      { divisions: 18, opacity: 0.62 }
    );
    addMeasuredRoadLine(
      group,
      [
        [roof.x + 3, roof.y + roof.height - 2],
        [roof.x + roof.width - 4, roof.y + roof.height - 2],
      ],
      3,
      z + 0.2,
      dark,
      { divisions: 8, opacity: 0.62 }
    );
    addMeasuredRoadLine(
      group,
      [
        [roof.x + 5, roof.y + 7],
        [roof.x + roof.width * 0.86, roof.y + 4],
      ],
      1.8,
      z + 0.25,
      '#ffffff',
      { divisions: 8, opacity: 0.44 }
    );

    const columns = key === 'food' ? 4 : key === 'lab' ? 3 : 4;
    const rows = key === 'lab' ? 5 : 4;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        if ((row + col + key.length) % 3 === 0) continue;
        const width = Math.max(4, body.width * 0.052);
        const height = Math.max(4, body.height * 0.052);
        const x = body.x + body.width * (0.17 + (col * 0.62) / Math.max(1, columns - 1)) - width / 2;
        const y = body.y + body.height * (0.2 + (row * 0.47) / Math.max(1, rows - 1));
        const cx = x + width / 2;
        const cy = y + height / 2;
        const insidePortal =
          cx > portal.x - 7 && cx < portal.x + portal.width + 7 && cy > portal.y - 8 && cy < portal.y + portal.height + 8;
        if (insidePortal) continue;
        addScreenRect(group, { x: x + 1, y: y + 1, width, height }, z + 0.32, screenMaterial('#061522', { opacity: 0.5 }));
        addScreenRect(group, { x, y, width, height }, z + 0.34, screenMaterial(light, { opacity: 0.78 }));
      }
    }

    [0.24, 0.48, 0.72].forEach((portion, index) => {
      const y = body.y + body.height * portion;
      addMeasuredRoadLine(
        group,
        [
          [body.x + 7, y],
          [body.x + body.width - 9, y - 2 - index * 0.4],
        ],
        1.8,
        z + 0.38 + index * 0.02,
        index % 2 ? light : dark,
        { divisions: 10, opacity: index % 2 ? 0.62 : 0.52 }
      );
    });

    addScreenBoxOutline(group, sign, z + 0.5, '#061522', 2, 0.78);
    addScreenBoxOutline(group, { x: sign.x + 3, y: sign.y + 3, width: sign.width - 6, height: sign.height - 6 }, z + 0.52, style.accent, 1, 0.56);
    addScreenEllipse(
      group,
      {
        x: portal.x - portal.width * 0.12,
        y: portal.y - portal.height * 0.08,
        width: portal.width * 1.24,
        height: portal.height * 1.08,
      },
      z + 0.6,
      screenMaterial(style.accent, { opacity: 0.04 })
    );

    if (key === 'food') {
      [0.2, 0.5, 0.8].forEach((portion, index) => {
        addScreenRect(
          group,
          { x: body.x + body.width * portion - 18, y: body.y + body.height - 58 + index, width: 36, height: 7 },
          z + 0.7,
          screenMaterial(index % 2 ? '#ffe0a0' : style.accent, { opacity: 0.58 })
        );
      });
    } else if (key === 'lab') {
      [body.x + body.width * 0.28, body.x + body.width * 0.74].forEach((x) => {
        addMeasuredRoadLine(group, [[x, body.y + 26], [x + 4, body.y + body.height - 28]], 3, z + 0.7, '#bff8ff', {
          divisions: 8,
          opacity: 0.52,
        });
      });
    } else if (key === 'clinic') {
      addScreenRect(group, { x: body.x + body.width * 0.6, y: body.y - 27, width: 8, height: 39 }, z + 0.7, screenMaterial('#ffffff', { opacity: 0.74 }));
      addScreenRect(group, { x: body.x + body.width * 0.5, y: body.y - 12, width: 44, height: 8 }, z + 0.72, screenMaterial('#ffffff', { opacity: 0.74 }));
    } else if (key === 'garage') {
      addScreenRect(
        group,
        { x: body.x + 22, y: body.y + body.height - 48, width: body.width - 42, height: 33 },
        z + 0.7,
        screenMaterial('#061522', { opacity: 0.5 })
      );
      for (let line = 0; line < 5; line += 1) {
        addScreenRect(
          group,
          { x: body.x + 30, y: body.y + body.height - 43 + line * 6, width: body.width - 58, height: 2 },
          z + 0.72,
          screenMaterial('#dff6ff', { opacity: 0.34 })
        );
      }
    } else if (key === 'gym') {
      addMeasuredRoadLine(
        group,
        [
          [body.x + body.width * 0.56, body.y + 23],
          [body.x + body.width * 0.56, body.y + body.height - 18],
        ],
        3,
        z + 0.7,
        dark,
        { divisions: 8, opacity: 0.48 }
      );
    }
  });

  world.add(group);
};

const addMeasuredDistrictBalancedEdgePolish = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-district-balanced-edge-polish';
  const z = 114.4;

  DISTRICT_ORDER.forEach((key) => {
    const target = plazaReferenceSpec.landmarks[key];
    const style = DISTRICT_SCREEN_DATA[key];
    if (!target || !style) return;
    const { body, full, portal, roof, sign } = target;
    const dark =
      key === 'food'
        ? '#4b1b08'
        : key === 'clinic'
          ? '#4c1018'
          : key === 'garage'
            ? '#061a3d'
            : key === 'lab'
              ? '#1c0b43'
              : '#12351f';
    const highlight = key === 'food' ? '#ffe0a0' : key === 'lab' ? '#ead8ff' : key === 'garage' ? '#dff6ff' : '#f7fbff';

    addMeasuredRoadLine(group, [[body.x + 2, body.y + body.height - 2], [body.x + body.width - 5, body.y + body.height - 4]], 2.2, z, dark, {
      divisions: 8,
      opacity: 0.22,
    });
    addMeasuredRoadLine(
      group,
      [
        [body.x + body.width - 3, body.y + 12],
        [full.x + full.width - 7, body.y + 26],
        [full.x + full.width - 7, body.y + body.height - 11],
      ],
      2.4,
      z + 0.05,
      '#061522',
      { divisions: 18, opacity: 0.2 }
    );
    addMeasuredRoadLine(group, [[body.x + 6, body.y + 7], [body.x + body.width * 0.56, body.y + 4]], 1.4, z + 0.1, highlight, {
      divisions: 8,
      opacity: 0.16,
    });
    addMeasuredRoadLine(
      group,
      [
        [roof.x + 5, roof.y + roof.height - 1],
        [roof.x + roof.width - 5, roof.y + roof.height - 2],
      ],
      2.2,
      z + 0.16,
      dark,
      { divisions: 8, opacity: 0.22 }
    );
    addMeasuredRoadLine(
      group,
      [
        [roof.x + 8, roof.y + 6],
        [roof.x + roof.width * 0.84, roof.y + 3],
      ],
      1.3,
      z + 0.2,
      highlight,
      { divisions: 8, opacity: 0.16 }
    );
    addScreenBoxOutline(group, sign, z + 0.25, '#061522', 1.6, 0.38);
    addScreenBoxOutline(group, { x: sign.x + 3, y: sign.y + 3, width: sign.width - 6, height: sign.height - 6 }, z + 0.27, style.accent, 1, 0.2);
    addScreenEllipse(
      group,
      {
        x: portal.x - portal.width * 0.07,
        y: portal.y - portal.height * 0.04,
        width: portal.width * 1.14,
        height: portal.height * 1.02,
      },
      z + 0.32,
      screenMaterial('#061522', { depthTest: false, depthWrite: false, opacity: 0.045 }),
      { renderOrder: 116 }
    );
  });

  world.add(group);
};

const addMeasuredDistrictReadableLabelPass = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-district-readable-label-pass';
  const labelOpacity = {
    clinic: 0.28,
    food: 0.25,
    garage: 0.3,
    gym: 0.3,
    lab: 0.25,
  };

  DISTRICT_ORDER.forEach((key) => {
    const target = plazaReferenceSpec.landmarks[key];
    const style = DISTRICT_SCREEN_DATA[key];
    if (!target || !style) return;
    addScreenRect(
      group,
      target.sign,
      116.2,
      textureMaterial(createDistrictSignTexture(key, style, target.sign), {
        depthTest: false,
        depthWrite: false,
        opacity: labelOpacity[key] ?? 0.14,
      }),
      { renderOrder: 149 }
    );
    addScreenBoxOutline(group, target.sign, 116.25, '#061522', 1.2, 0.18);
  });

  world.add(group);
};

const addMeasuredDistrictHardEdgeTopPass = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-district-hard-edge-top-pass';
  const lineOptions = { depthTest: false, depthWrite: false, divisions: 8, renderOrder: 150 };

  DISTRICT_ORDER.forEach((key) => {
    const target = plazaReferenceSpec.landmarks[key];
    const style = DISTRICT_SCREEN_DATA[key];
    if (!target || !style) return;
    const { body, full, portal, roof } = target;
    const dark =
      key === 'food'
        ? '#421606'
        : key === 'clinic'
          ? '#470d16'
          : key === 'garage'
            ? '#061734'
            : key === 'lab'
              ? '#1b0a3e'
              : '#10301c';
    const highlight = key === 'food' || key === 'clinic' ? '#fff3df' : key === 'garage' ? '#dff7ff' : '#f7fbff';
    const z = 116.7;
    const line = (points, width, color, opacity, offset = 0) => {
      addMeasuredRoadLine(group, points, width, z + offset, color, { ...lineOptions, opacity });
    };

    line(
      [
        [body.x + 3, body.y + body.height - 4],
        [body.x + body.width - 7, body.y + body.height - 5],
      ],
      2.4,
      dark,
      0.22
    );
    line(
      [
        [body.x + body.width - 4, body.y + 12],
        [full.x + full.width - 8, body.y + 25],
        [full.x + full.width - 8, body.y + body.height - 12],
      ],
      2.4,
      dark,
      0.2,
      0.04
    );
    line(
      [
        [roof.x + 5, roof.y + roof.height - 2],
        [roof.x + roof.width - 5, roof.y + roof.height - 2],
      ],
      2.3,
      dark,
      0.24,
      0.08
    );
    line(
      [
        [roof.x + 8, roof.y + 6],
        [roof.x + roof.width * 0.86, roof.y + 3],
      ],
      1.4,
      highlight,
      0.16,
      0.12
    );
    line(
      [
        [portal.x - portal.width * 0.18, portal.y + portal.height * 0.94],
        [portal.x + portal.width * 1.18, portal.y + portal.height * 0.94],
      ],
      1.8,
      dark,
      0.18,
      0.16
    );
  });

  world.add(group);
};

const addMeasuredDistrictBodyReinforcement = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-district-body-reinforcement';

  DISTRICT_ORDER.forEach((key) => {
    const target = plazaReferenceSpec.landmarks[key];
    const style = DISTRICT_SCREEN_DATA[key];
    if (!target || !style) return;
    addScreenRect(
      group,
      target.full,
      111.4,
      textureMaterial(createDistrictBodyReinforcementTexture(key, target, style), {
        alphaTest: 0.01,
        depthTest: false,
        depthWrite: false,
        opacity: key === 'food' || key === 'gym' ? 0.39 : 0.33,
      }),
      { renderOrder: 116 }
    );
  });

  world.add(group);
};

const addMeasuredGeneratedFacadeHeroPass = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-generated-facade-hero-pass';

  DISTRICT_ORDER.forEach((key) => {
    const target = plazaReferenceSpec.landmarks[key];
    const texture = getGeneratedDistrictFacadeTexture(key);
    if (!target || !texture) return;
    const fittedBox = fitTextureAlphaBoundsToBox(target.full, GENERATED_DISTRICT_FACADE_ALPHA_BOUNDS[key]);
    addScreenRect(
      group,
      fittedBox,
      112.82,
      textureMaterial(texture, {
        alphaTest: 0.01,
        depthTest: false,
        depthWrite: false,
        opacity: 0.68,
      }),
      { renderOrder: 116.4 }
    );
  });

  world.add(group);
};

const addMeasuredForegroundFinalLinework = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-foreground-final-linework';

  addScreenPolygon(
    group,
    [
      [0, 438],
      [218, 402],
      [454, 448],
      [488, 484],
      [224, 430],
      [0, 466],
    ],
    100.75,
    screenMaterial('#9aa6b0', { opacity: 0.24 })
  );
  addMeasuredRoadLine(group, [[0, 421], [224, 386], [462, 432]], 4.8, 100.9, '#f7fbff', {
    divisions: 36,
    opacity: 0.92,
  });
  addMeasuredRoadLine(group, [[0, 438], [218, 402], [452, 447]], 3.4, 100.96, '#ef9d5c', {
    divisions: 36,
    opacity: 0.78,
  });

  [
    [[0, 418], [224, 386], [462, 432]],
    [[0, 436], [218, 402], [452, 447]],
    [[0, 462], [224, 428], [486, 482]],
  ].forEach((points, index) => {
    addMeasuredRoadLine(group, points, index === 0 ? 3.6 : 2.5, 101 + index * 0.06, index === 0 ? '#f7fbff' : index === 1 ? '#ef9d5c' : '#061522', {
      divisions: 34,
      opacity: index === 0 ? 0.84 : 0.62,
    });
  });

  [
    [18, 424, -9, 0.72],
    [54, 419, -9, 0.68],
    [92, 413, -8, 0.64],
    [132, 408, -8, 0.6],
    [174, 402, -7, 0.56],
    [218, 398, -5, 0.52],
    [262, 405, 2, 0.48],
    [306, 413, 6, 0.44],
  ].forEach(([x, y, angle, scale]) => {
    addScreenRect(group, { x: x - 2 * scale, y: y - 13 * scale, width: 4 * scale, height: 17 * scale }, 101.2, screenMaterial('#f7fbff', { opacity: 0.82 }), {
      angleDegrees: angle,
    });
    addScreenRect(group, { x: x - 6 * scale, y: y - 15 * scale, width: 12 * scale, height: 3 * scale }, 101.25, screenMaterial('#ef9d5c', { opacity: 0.78 }), {
      angleDegrees: angle,
    });
  });

  [
    [696, 448, 58, -6],
    [762, 446, 58, -2],
    [835, 452, 60, 5],
    [916, 466, 56, 8],
    [996, 486, 54, 11],
    [82, 445, 44, -13],
    [145, 431, 44, -11],
    [212, 420, 46, -8],
    [282, 414, 46, -4],
  ].forEach(([x, y, width, angle]) => {
    addScreenRect(group, { x: x - width / 2, y: y - 1.2, width, height: 2.4 }, 101.35, screenMaterial(CITY3D_PALETTE.roadLine, { opacity: 0.72 }), {
      angleDegrees: angle,
    });
  });

  [
    [[0, 462], [126, 440], [205, 522]],
    [[0, 491], [166, 462], [226, 522]],
  ].forEach((points, index) => {
    addMeasuredRoadLine(group, points, index === 0 ? 2.8 : 2.2, 101.5 + index * 0.06, index === 0 ? CITY3D_PALETTE.cyan : '#f7fbff', {
      divisions: 34,
      opacity: index === 0 ? 0.56 : 0.36,
    });
  });

  world.add(group);
};

const addMeasuredRoadTonePatches = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-road-tone-patches';
  const matteOptions = { depthTest: false, depthWrite: false };

  addScreenPolygon(
    group,
    [
      [238, 350],
      [405, 354],
      [424, 411],
      [270, 421],
      [236, 390],
    ],
    102.08,
    screenMaterial('#071523', { ...matteOptions, opacity: 0.45 }),
    { renderOrder: 120 }
  );
  addScreenPolygon(
    group,
    [
      [30, 318],
      [250, 312],
      [250, 390],
      [30, 390],
    ],
    102.09,
    screenMaterial('#14281e', { ...matteOptions, opacity: 0.38 }),
    { renderOrder: 120.5 }
  );
  addScreenPolygon(
    group,
    [
      [30, 245],
      [92, 252],
      [88, 390],
      [30, 390],
    ],
    102.095,
    screenMaterial('#14281e', { ...matteOptions, opacity: 0.24 }),
    { renderOrder: 120.55 }
  );
  addScreenPolygon(
    group,
    [
      [88, 258],
      [250, 262],
      [250, 318],
      [88, 318],
    ],
    102.097,
    screenMaterial('#14281e', { ...matteOptions, opacity: 0.48 }),
    { renderOrder: 120.58 }
  );
  addScreenPolygon(
    group,
    [
      [812, 418],
      [1058, 462],
      [1058, 522],
      [844, 522],
      [760, 466],
    ],
    102.1,
    screenMaterial('#d1b35c', { ...matteOptions, opacity: 0.16 }),
    { renderOrder: 121 }
  );
  addScreenPolygon(
    group,
    [
      [0, 430],
      [230, 394],
      [462, 432],
      [454, 450],
      [214, 405],
      [0, 440],
    ],
    102.11,
    screenMaterial('#071523', { ...matteOptions, opacity: 0.2 }),
    { renderOrder: 121.5 }
  );
  addScreenPolygon(
    group,
    [
      [748, 358],
      [982, 365],
      [978, 425],
      [744, 416],
    ],
    102.12,
    screenMaterial('#071523', { ...matteOptions, opacity: 0.36 }),
    { renderOrder: 122 }
  );
  addScreenPolygon(
    group,
    [
      [744, 355],
      [982, 363],
      [978, 425],
      [744, 416],
    ],
    102.13,
    screenMaterial('#cdcebe', { ...matteOptions, opacity: 0.12 }),
    { renderOrder: 123 }
  );
  addScreenEllipse(
    group,
    { x: 481, y: 348, width: 251, height: 96 },
    102.14,
    screenMaterial('#1e262d', { ...matteOptions, opacity: 0.04 }),
    { renderOrder: 124 }
  );
  addScreenPolygon(
    group,
    [
      [430, 330],
      [560, 330],
      [560, 375],
      [430, 385],
    ],
    102.15,
    screenMaterial('#071523', { ...matteOptions, opacity: 0.24 }),
    { renderOrder: 125 }
  );

  world.add(group);
};

const addMeasuredRoadLightBalance = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-road-light-balance';
  const materialOptions = { depthTest: false, depthWrite: false };

  addScreenPolygon(
    group,
    [
      [0, 466],
      [143, 433],
      [302, 410],
      [470, 408],
      [604, 430],
      [756, 423],
      [922, 438],
      [1058, 466],
      [1058, 522],
      [0, 522],
    ],
    102.18,
    screenMaterial('#d2d0c7', { ...materialOptions, opacity: 0.018 }),
    { renderOrder: 132 }
  );
  addScreenPolygon(
    group,
    [
      [0, 390],
      [132, 374],
      [284, 365],
      [439, 373],
      [604, 398],
      [756, 380],
      [907, 356],
      [1058, 330],
      [1058, 380],
      [910, 405],
      [756, 423],
      [604, 430],
      [470, 408],
      [302, 410],
      [143, 433],
      [0, 467],
    ],
    102.19,
    screenMaterial('#d7d2c6', { ...materialOptions, opacity: 0.012 }),
    { renderOrder: 132.1 }
  );
  addScreenPolygon(
    group,
    [
      [300, 360],
      [438, 370],
      [604, 398],
      [756, 382],
      [760, 424],
      [604, 432],
      [470, 410],
      [304, 412],
    ],
    102.2,
    screenMaterial('#d9cfc8', { ...materialOptions, opacity: 0.04 }),
    { renderOrder: 132.2 }
  );
  addScreenPolygon(
    group,
    [
      [756, 382],
      [907, 356],
      [1058, 330],
      [1058, 456],
      [922, 438],
      [756, 424],
    ],
    102.21,
    screenMaterial('#d7cdc0', { ...materialOptions, opacity: 0.048 }),
    { renderOrder: 132.3 }
  );
  addScreenPolygon(
    group,
    [
      [602, 430],
      [756, 423],
      [922, 438],
      [1058, 466],
      [1058, 522],
      [840, 522],
      [732, 456],
      [604, 462],
    ],
    102.22,
    screenMaterial('#d4c9b9', { ...materialOptions, opacity: 0.04 }),
    { renderOrder: 132.4 }
  );

  world.add(group);
};

const addMeasuredBridgeWaterColorBalance = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-bridge-water-color-balance';
  const materialOptions = { depthTest: false, depthWrite: false };

  [
    { color: '#5d5a5d', opacity: 0.12, points: plazaReferenceSpec.water.polygon, z: 102 },
    { color: '#55595f', opacity: 0.12, points: plazaReferenceSpec.bridge.deckPolygon, z: 102.05 },
    { color: '#4e4952', opacity: 0.12, points: plazaReferenceSpec.bridge.railPolygon, z: 102.1 },
    {
      color: '#726b76',
      opacity: 0.1,
      points: [
        [0, 421],
        [224, 386],
        [462, 432],
        [452, 448],
        [214, 401],
        [0, 434],
      ],
      z: 102.15,
    },
  ].forEach(({ color, opacity, points, z }) => {
    addScreenPolygon(group, points, z, screenMaterial(color, { ...materialOptions, opacity }));
  });

  world.add(group);
};

const addMeasuredBridgeLaneArrow = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-bridge-lane-arrow';
  const materialOptions = { depthTest: false, depthWrite: false };

  addScreenPolygon(
    group,
    [
      [44, 451],
      [96, 439],
      [94, 446],
      [139, 438],
      [143, 448],
      [100, 458],
      [102, 466],
    ],
    102.22,
    screenMaterial('#f7fbff', { ...materialOptions, opacity: 0.52 }),
    { renderOrder: 133 }
  );
  addScreenPolygon(
    group,
    [
      [0, 458],
      [126, 435],
      [146, 440],
      [16, 466],
    ],
    102.21,
    screenMaterial('#2a333d', { ...materialOptions, opacity: 0.12 }),
    { renderOrder: 132.8 }
  );

  world.add(group);
};

const addMeasuredForegroundCrispTopPass = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-foreground-crisp-top-pass';
  const lineOptions = { depthTest: false, depthWrite: false, renderOrder: 146 };
  const rectOptions = { renderOrder: 146 };
  const materialOptions = { depthTest: false, depthWrite: false };

  [
    { color: '#f8fbf3', opacity: 0.44, points: [[0, 420], [224, 386], [462, 431]], width: 3.8 },
    { color: '#f0a461', opacity: 0.39, points: [[0, 439], [220, 404], [452, 447]], width: 2.8 },
    { color: '#0a1520', opacity: 0.25, points: [[0, 463], [224, 429], [486, 482]], width: 2.7 },
    { color: '#f8fbf3', opacity: 0.31, points: [[634, 391], [742, 375], [872, 350], [1058, 318]], width: 2.2 },
    { color: '#ffd451', opacity: 0.36, points: [[642, 456], [775, 450], [919, 468], [1058, 501]], width: 2.5 },
    { color: '#f8fbf3', opacity: 0.28, points: [[748, 409], [884, 397], [1058, 377]], width: 2.1 },
  ].forEach(({ color, opacity, points, width }, index) => {
    addMeasuredRoadLine(group, points, width, 103.1 + index * 0.04, color, {
      ...lineOptions,
      divisions: 48,
      opacity,
    });
  });

  [
    [36, 449, 48, -12, '#f8fbf3', 0.44],
    [100, 437, 52, -11, '#f8fbf3', 0.41],
    [166, 425, 54, -9, '#f8fbf3', 0.38],
    [236, 416, 54, -4, '#f8fbf3', 0.34],
    [714, 449, 58, -4, '#ffd451', 0.4],
    [784, 449, 58, 0, '#ffd451', 0.37],
    [860, 455, 58, 5, '#ffd451', 0.34],
    [944, 472, 54, 9, '#ffd451', 0.3],
  ].forEach(([x, y, width, angle, color, opacity]) => {
    addScreenRect(
      group,
      { x: x - width / 2, y: y - 1.1, width, height: 2.2 },
      103.4,
      screenMaterial(color, { ...materialOptions, opacity }),
      { ...rectOptions, angleDegrees: angle }
    );
  });

  plazaReferenceSpec.crosswalks.forEach((crosswalk, crosswalkIndex) => {
    const stripeCount = Math.max(5, Math.floor(crosswalk.box.width / 13));
    const stripeWidth = crosswalk.box.width / (stripeCount * 2.1);
    for (let index = 0; index < stripeCount; index += 1) {
      addScreenRect(
        group,
        {
          x: crosswalk.box.x + index * (crosswalk.box.width / stripeCount),
          y: crosswalk.box.y + crosswalk.box.height * 0.18,
          width: stripeWidth,
          height: crosswalk.box.height * 0.64,
        },
        103.8 + crosswalkIndex * 0.02,
        screenMaterial('#f8fbf3', { ...materialOptions, opacity: 0.28 }),
        { ...rectOptions, angleDegrees: crosswalk.angleDegrees }
      );
    }
  });

  world.add(group);
};

const addMeasuredRoundaboutTopDetailPass = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-roundabout-top-detail-pass';
  const materialOptions = { depthTest: false, depthWrite: false };
  const outer = plazaReferenceSpec.roundabout.outerEllipse;
  const island = plazaReferenceSpec.roundabout.innerIsland;
  const center = plazaReferenceSpec.roundabout.center;

  addScreenEllipseRingSegment(
    group,
    { x: outer.x + 12, y: outer.y + 8, width: outer.width - 24, height: outer.height - 16 },
    { x: 44, y: 23 },
    Math.PI * 0.02,
    Math.PI * 1.98,
    104.34,
    screenMaterial('#1f2932', { ...materialOptions, opacity: 0.18 }),
    { renderOrder: 147, segments: 96 }
  );
  addScreenEllipseRingSegment(
    group,
    { x: outer.x + 4, y: outer.y + 3, width: outer.width - 8, height: outer.height - 5 },
    { x: 26, y: 16 },
    Math.PI * 0.02,
    Math.PI * 1.98,
    104.4,
    screenMaterial('#f7fbff', { ...materialOptions, opacity: 0.18 }),
    { renderOrder: 148, segments: 96 }
  );
  addScreenEllipseRingSegment(
    group,
    { x: outer.x + 10, y: outer.y + 7, width: outer.width - 20, height: outer.height - 13 },
    { x: 21, y: 13 },
    Math.PI * 0.08,
    Math.PI * 0.92,
    104.45,
    screenMaterial('#ffd451', { ...materialOptions, opacity: 0.16 }),
    { renderOrder: 148, segments: 72 }
  );
  addScreenEllipse(
    group,
    { x: island.x - 2, y: island.y - 1, width: island.width + 4, height: island.height + 2 },
    104.5,
    screenMaterial('#eef1e6', { ...materialOptions, opacity: 0.18 }),
    { renderOrder: 149, segments: 96 }
  );
  plazaReferenceSpec.roundabout.ringMarkings.forEach((box, index) => {
    addScreenEllipse(
      group,
      box,
      104.55 + index * 0.03,
      screenMaterial(index === 0 ? '#f7fbff' : CITY3D_PALETTE.cyan, {
        ...materialOptions,
        opacity: index === 0 ? 0.24 : 0.16,
      }),
      { renderOrder: 150, segments: 96 }
    );
  });
  for (let index = 0; index < 18; index += 1) {
    const angle = -0.15 + (Math.PI * 2 * index) / 18;
    const x = center.x + Math.cos(angle) * 118;
    const y = center.y + Math.sin(angle) * 54;
    addScreenRect(
      group,
      { x: x - 8, y: y - 1.1, width: 16, height: 2.2 },
      104.7,
      screenMaterial(index % 2 ? '#f7fbff' : CITY3D_PALETTE.roadLine, {
        ...materialOptions,
        opacity: index % 2 ? 0.24 : 0.18,
      }),
      { angleDegrees: (angle * 180) / Math.PI + 90, renderOrder: 151 }
    );
  }

  world.add(group);
};

const addMeasuredLowerLeftBridgeTonalMass = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-lower-left-bridge-tonal-mass';
  const materialOptions = { depthTest: false, depthWrite: false };

  addScreenPolygon(
    group,
    [
      [0, 446],
      [142, 424],
      [238, 522],
      [0, 522],
    ],
    98.05,
    screenMaterial('#043f63', { ...materialOptions, opacity: 0.4 })
  );
  addScreenPolygon(
    group,
    [
      [0, 450],
      [205, 414],
      [438, 459],
      [493, 522],
      [0, 522],
    ],
    98.1,
    screenMaterial('#2d3741', { ...materialOptions, opacity: 0.34 })
  );
  addScreenPolygon(
    group,
    [
      [0, 421],
      [224, 386],
      [462, 432],
      [452, 445],
      [218, 401],
      [0, 436],
    ],
    98.2,
    screenMaterial('#101a24', { ...materialOptions, opacity: 0.26 })
  );

  world.add(group);
};

const addMeasuredRightForegroundWarmRoadMass = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-right-foreground-warm-road-mass';
  const materialOptions = { depthTest: false, depthWrite: false };

  addScreenPolygon(
    group,
    [
      [604, 430],
      [756, 423],
      [922, 438],
      [1058, 466],
      [1058, 522],
      [620, 522],
      [548, 462],
    ],
    98.12,
    screenMaterial('#8b6b3c', { ...materialOptions, opacity: 0.11 })
  );
  addScreenPolygon(
    group,
    [
      [780, 455],
      [948, 463],
      [1058, 492],
      [1058, 522],
      [760, 522],
      [650, 486],
    ],
    98.16,
    screenMaterial('#b18434', { ...materialOptions, opacity: 0.08 })
  );
  addMeasuredRoadLine(group, [[636, 462], [770, 454], [914, 468], [1058, 501]], 3.2, 99.2, CITY3D_PALETTE.roadLine, {
    divisions: 48,
    opacity: 0.42,
  });
  addMeasuredRoadLine(group, [[708, 438], [826, 440], [954, 462], [1058, 486]], 2.5, 99.26, '#efb081', {
    divisions: 48,
    opacity: 0.28,
  });

  world.add(group);
};

const addMeasuredForegroundSurfaceCorrection = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-foreground-surface-correction';
  const materialOptions = { depthTest: false, depthWrite: false };

  addScreenPolygon(
    group,
    [
      [536, 203],
      [572, 190],
      [634, 193],
      [664, 342],
      [606, 400],
      [556, 363],
    ],
    55.6,
    screenMaterial('#202b34', { ...materialOptions, opacity: 0.28 })
  );
  addScreenPolygon(
    group,
    [
      [0, 456],
      [140, 430],
      [304, 410],
      [470, 407],
      [604, 430],
      [586, 522],
      [250, 522],
      [188, 448],
      [0, 492],
    ],
    55.8,
    screenMaterial('#1d2730', { ...materialOptions, opacity: 0.34 })
  );
  addScreenPolygon(
    group,
    [
      [604, 430],
      [756, 422],
      [922, 438],
      [1058, 466],
      [1058, 522],
      [620, 522],
      [548, 462],
    ],
    55.82,
    screenMaterial('#1c252d', { ...materialOptions, opacity: 0.32 })
  );
  addScreenPolygon(
    group,
    [
      [0, 421],
      [224, 386],
      [462, 432],
      [454, 447],
      [218, 402],
      [0, 437],
    ],
    56,
    screenMaterial('#e8e2d2', { ...materialOptions, opacity: 0.36 })
  );
  addScreenPolygon(
    group,
    [
      [0, 444],
      [206, 410],
      [438, 456],
      [492, 522],
      [0, 522],
    ],
    56.08,
    screenMaterial('#4b5660', { ...materialOptions, opacity: 0.3 })
  );
  addScreenPolygon(
    group,
    [
      [0, 448],
      [142, 424],
      [238, 522],
      [0, 522],
    ],
    56.16,
    screenMaterial('#035b82', { ...materialOptions, opacity: 0.26 })
  );

  [
    { points: [[0, 421], [224, 386], [462, 432]], color: '#f7fbff', width: 4.2, opacity: 0.8 },
    { points: [[0, 438], [218, 402], [452, 447]], color: '#ef9d5c', width: 3.2, opacity: 0.62 },
    { points: [[0, 467], [143, 433], [302, 410], [470, 408], [604, 430], [756, 423], [922, 438], [1058, 466]], color: '#f7fbff', width: 4.6, opacity: 0.54 },
    { points: [[642, 462], [770, 454], [914, 468], [1058, 501]], color: CITY3D_PALETTE.roadLine, width: 3.2, opacity: 0.48 },
  ].forEach(({ points, color, width, opacity }, index) => {
    addMeasuredRoadLine(group, points, width, 56.5 + index * 0.08, color, {
      depthTest: false,
      depthWrite: false,
      divisions: 64,
      opacity,
    });
  });

  world.add(group);
};

const addTracedPlazaShapeLayer = (world, groupName, options = {}) => {
  const shapes = plazaSceneShapes.groups?.[groupName] || [];
  const group = new THREE.Group();
  group.name = `traced-plaza-${groupName}`;
  shapes.forEach((shape) => {
    const renderOrder = (shape.renderOrder || 0) + (options.renderOrderOffset || 0);
    const scaledOpacity = (shape.opacity ?? 1) * (options.opacityScale ?? 1);
    const opacity = Math.min(options.maxOpacity ?? 1, Math.max(options.minOpacity ?? 0, scaledOpacity));
    const material = screenMaterial(shape.color, {
      depthTest: false,
      depthWrite: false,
      opacity,
    });
    if (shape.type === 'polygon') {
      addScreenPolygon(group, shape.points, shape.z + (options.zOffset || 0), material, { renderOrder });
    } else if (shape.type === 'rect') {
      addScreenRect(group, shape.box, shape.z + (options.zOffset || 0), material, {
        angleDegrees: shape.angleDegrees || 0,
        renderOrder,
      });
    } else if (shape.type === 'ellipse') {
      addScreenEllipse(group, shape.box, shape.z + (options.zOffset || 0), material, {
        renderOrder,
        segments: shape.segments || 96,
      });
    } else if (shape.type === 'ribbon') {
      const sampled = sampleScreenPolyline(shape.points, shape.divisions || Math.max(24, shape.points.length * 12));
      const mesh = new THREE.Mesh(createScreenRibbonGeometry(sampled, shape.width), material);
      mesh.position.z = shape.z + (options.zOffset || 0);
      mesh.renderOrder = renderOrder;
      group.add(mesh);
    }
  });
  world.add(group);
  return group;
};

const addTracedPlazaFineFacetLayer = (world, groupName, options = {}) => {
  const fineGroup = plazaSceneShapes.fineGroups?.[groupName];
  if (!fineGroup?.bounds || !fineGroup?.palette || !fineGroup?.cells?.length) return null;

  const cell = fineGroup.cell ?? 4;
  const [x0, y0, x1, y1] = fineGroup.bounds;
  const columns = Math.ceil((x1 - x0) / cell);
  const cellColorByIndex = new Map();
  const palette = fineGroup.palette.map((packed) => {
    const color = new THREE.Color();
    color.setRGB(((packed >> 8) & 0xf) / 15, ((packed >> 4) & 0xf) / 15, (packed & 0xf) / 15, THREE.SRGBColorSpace);
    return [color.r, color.g, color.b];
  });
  fineGroup.cells.forEach(([cellIndex, paletteIndex]) => {
    cellColorByIndex.set(cellIndex, palette[paletteIndex] || [0, 0, 0]);
  });

  const averageCornerColor = (cellIndex, offsets) => {
    const row = Math.floor(cellIndex / columns);
    const column = cellIndex % columns;
    const color = [0, 0, 0];
    let samples = 0;
    offsets.forEach(([dx, dy]) => {
      const neighborColumn = column + dx;
      const neighborRow = row + dy;
      if (neighborColumn < 0 || neighborRow < 0 || neighborColumn >= columns) return;
      const sample = cellColorByIndex.get(neighborRow * columns + neighborColumn);
      if (!sample) return;
      color[0] += sample[0];
      color[1] += sample[1];
      color[2] += sample[2];
      samples += 1;
    });
    if (!samples) return cellColorByIndex.get(cellIndex) || [0, 0, 0];
    return color.map((channel) => channel / samples);
  };

  const positions = [];
  const colors = [];
  const pushVertex = (x, y, z, color) => {
    positions.push(screenX(x), screenY(y), z);
    colors.push(color[0], color[1], color[2]);
  };
  const expand = options.expandPx ?? 0.15;
  const z = options.z ?? 0;

  fineGroup.cells.forEach(([cellIndex]) => {
    const x = x0 + (cellIndex % columns) * cell;
    const y = y0 + Math.floor(cellIndex / columns) * cell;
    const width = Math.min(cell, x1 - x);
    const height = Math.min(cell, y1 - y);
    const left = x - expand;
    const right = x + width + expand;
    const top = y - expand;
    const bottom = y + height + expand;
    const tl = averageCornerColor(cellIndex, [[0, 0], [-1, 0], [0, -1], [-1, -1]]);
    const tr = averageCornerColor(cellIndex, [[0, 0], [1, 0], [0, -1], [1, -1]]);
    const br = averageCornerColor(cellIndex, [[0, 0], [1, 0], [0, 1], [1, 1]]);
    const bl = averageCornerColor(cellIndex, [[0, 0], [-1, 0], [0, 1], [-1, 1]]);
    pushVertex(left, top, z, tl);
    pushVertex(left, bottom, z, bl);
    pushVertex(right, bottom, z, br);
    pushVertex(left, top, z, tl);
    pushVertex(right, bottom, z, br);
    pushVertex(right, top, z, tr);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const layerOpacity =
    (options.opacity ?? 1) *
    Math.min(
      options.maxShapeOpacity ?? 1,
      Math.max(options.minShapeOpacity ?? 0, (fineGroup.opacity ?? 1) * (options.opacityScale ?? 1))
    );
  const material = new THREE.MeshBasicMaterial({
    depthTest: false,
    depthWrite: false,
    opacity: layerOpacity,
    side: THREE.DoubleSide,
    transparent: true,
    vertexColors: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `traced-plaza-fine-facets-${groupName}`;
  mesh.renderOrder = options.renderOrder ?? 0;
  mesh.frustumCulled = false;
  world.add(mesh);
  return mesh;
};

const createMeasuredDistrictObjectAtlasTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = PLAZA_SCREEN.width;
  canvas.height = PLAZA_SCREEN.height;
  const ctx = canvas.getContext('2d');

  const drawPolygon = (points, color, opacity) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawRect = (box, color, opacity, angleDegrees = 0) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(box.x + box.width / 2, box.y + box.height / 2);
    ctx.rotate((angleDegrees * Math.PI) / 180);
    ctx.fillStyle = color;
    ctx.fillRect(-box.width / 2, -box.height / 2, box.width, box.height);
    ctx.restore();
  };

  const drawEllipse = (box, color, opacity) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(box.x + box.width / 2, box.y + box.height / 2, box.width / 2, box.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  ['districtFacadeFacets', 'districtTraceDetails'].forEach((groupName, groupIndex) => {
    (plazaSceneShapes.groups?.[groupName] || []).forEach((shape) => {
      const opacity = Math.min(groupIndex ? 0.82 : 0.9, Math.max(0.22, (shape.opacity ?? 1) * (groupIndex ? 1.18 : 1.35)));
      if (shape.type === 'polygon') drawPolygon(shape.points, shape.color, opacity);
      if (shape.type === 'rect') drawRect(shape.box, shape.color, opacity, shape.angleDegrees || 0);
      if (shape.type === 'ellipse') drawEllipse(shape.box, shape.color, opacity);
    });
  });

  DISTRICT_ORDER.forEach((key) => {
    const target = plazaReferenceSpec.landmarks[key];
    const style = DISTRICT_SCREEN_DATA[key];
    if (!target || !style) return;
    const { body, portal, sign } = target;
    drawRect(sign, style.dark, 0.92);
    drawRect({ x: sign.x + 4, y: sign.y + 4, width: sign.width - 8, height: Math.max(3, sign.height * 0.16) }, '#f7fbff', 0.16);
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#f7fbff';
    ctx.font = `900 ${Math.max(12, sign.height * 0.5)}px Impact, Arial Black, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.58)';
    ctx.shadowBlur = 2;
    ctx.fillText(style.sign, sign.x + sign.width / 2, sign.y + sign.height / 2 + 1, sign.width * 0.9);
    ctx.restore();

    const portalCx = portal.x + portal.width / 2;
    const portalCy = portal.y + portal.height * 0.58;
    const glow = ctx.createRadialGradient(portalCx, portalCy, 8, portalCx, portalCy, portal.height * 0.66);
    glow.addColorStop(0, rgbString(hexToRgb(style.accent), 0.32));
    glow.addColorStop(0.52, rgbString(hexToRgb(style.accent), 0.12));
    glow.addColorStop(1, rgbString(hexToRgb(style.accent), 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(portalCx, portalCy, portal.width * 0.7, portal.height * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    drawEllipse({ x: portal.x + portal.width * 0.2, y: portal.y + portal.height * 0.44, width: portal.width * 0.6, height: portal.height * 0.42 }, '#061522', 0.42);

    for (let row = 0; row < 3; row += 1) {
      drawRect(
        {
          x: body.x + body.width * 0.15,
          y: body.y + body.height * (0.24 + row * 0.18),
          width: body.width * 0.7,
          height: 2,
        },
        key === 'food' ? '#5a2309' : style.dark,
        0.32
      );
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const addMeasuredDistrictObjectAtlas = (world) => {
  addScreenRect(
    world,
    { x: 0, y: 0, width: PLAZA_SCREEN.width, height: PLAZA_SCREEN.height },
    117,
    textureMaterial(createMeasuredDistrictObjectAtlasTexture(), { opacity: 0.1 }),
    { renderOrder: 118 }
  );
};

const addMeasuredRoadDetails = (world) => {
  const yellow = CITY3D_PALETTE.roadLine;
  const white = '#f7fbff';
  const midArc = plazaReferenceSpec.roads.find((road) => road.id === 'midArc');
  const foregroundArc = plazaReferenceSpec.roads.find((road) => road.id === 'foregroundArc');
  const backbone = plazaReferenceSpec.roads.find((road) => road.id === 'backbone');
  if (midArc) addMeasuredRoadLine(world, midArc.polyline, 3, 37, yellow, { divisions: 120, opacity: 0.8 });
  if (foregroundArc) addMeasuredRoadLine(world, foregroundArc.polyline, 3, 38, yellow, { divisions: 120, opacity: 0.78 });
  if (backbone) addMeasuredRoadLine(world, backbone.polyline, 3, 37, white, { divisions: 80, opacity: 0.7 });

  [
    [[579, 176], [584, 236], [592, 318], [598, 374], [604, 397]],
    [[630, 176], [626, 238], [617, 318], [609, 374], [604, 397]],
  ].forEach((points) => addMeasuredRoadLine(world, points, 2.4, 38.4, white, { divisions: 72, opacity: 0.68 }));
  [
    [[548, 228], [570, 270], [590, 338]],
    [[660, 226], [638, 270], [616, 338]],
  ].forEach((points) => addMeasuredRoadLine(world, points, 2.2, 38.6, yellow, { divisions: 54, opacity: 0.58 }));
  [
    [596, 208, 18, 88],
    [603, 244, 20, 91],
    [608, 286, 23, 94],
    [610, 326, 25, 97],
  ].forEach(([x, y, width, angle]) => {
    addScreenRect(world, { x: x - width / 2, y: y - 1.2, width, height: 2.4 }, 39.2, screenMaterial('#f7fbff', { opacity: 0.72 }), {
      angleDegrees: angle,
    });
  });

  [
    [336, 399, 40, -8],
    [384, 407, 40, -8],
    [700, 388, 42, -10],
    [828, 424, 46, 11],
    [910, 456, 40, 12],
    [976, 476, 36, 12],
    [506, 452, 34, 9],
    [74, 463, 36, -15],
    [142, 450, 42, -13],
    [228, 438, 45, -9],
    [310, 431, 42, -4],
    [616, 462, 50, -3],
    [760, 454, 48, 4],
    [874, 497, 56, 8],
    [1006, 506, 48, 11],
  ].forEach(([x, y, width, angle]) => {
    addScreenRect(world, { x, y, width, height: 3 }, 39, screenMaterial(yellow, { opacity: 0.88 }), {
      angleDegrees: angle,
    });
  });

  [
    [116, 390, 28, -15],
    [164, 382, 26, -12],
    [226, 378, 24, -9],
    [764, 356, 24, -20],
    [812, 342, 22, -22],
    [930, 338, 24, -12],
    [985, 328, 26, -10],
    [42, 430, 30, -16],
    [92, 420, 32, -15],
    [145, 410, 30, -13],
    [276, 402, 28, -7],
    [548, 430, 24, -10],
    [595, 434, 24, 8],
    [688, 430, 28, 10],
    [1014, 392, 28, -8],
  ].forEach(([x, y, width, angle]) => {
    addScreenRect(world, { x, y, width, height: 3 }, 39, screenMaterial(white, { opacity: 0.82 }), {
      angleDegrees: angle,
    });
  });

  [
    [[878, 478], [905, 469], [900, 488]],
    [[943, 492], [973, 484], [965, 503]],
    [[407, 420], [432, 414], [427, 431]],
    [[970, 510], [1002, 501], [994, 520]],
    [[232, 462], [260, 455], [252, 473]],
  ].forEach((points) => addScreenPolygon(world, points, 40, screenMaterial(yellow, { opacity: 0.82 })));

  [
    [[4, 464], [144, 431], [302, 408], [470, 407], [604, 430], [756, 422], [922, 438], [1054, 466]],
    [[24, 438], [176, 407], [330, 400], [472, 407], [602, 426]],
    [[604, 427], [742, 401], [902, 382], [1054, 354]],
  ].forEach((points, index) => {
    addMeasuredRoadLine(world, points, index === 0 ? 4.4 : 3.4, 49.2 + index * 0.1, white, {
      divisions: 110,
      opacity: index === 0 ? 0.58 : 0.5,
    });
  });

  [
    [696, 448, 58, -6],
    [762, 446, 58, -2],
    [835, 452, 60, 5],
    [916, 466, 56, 8],
    [996, 486, 54, 11],
    [80, 445, 44, -13],
    [142, 431, 44, -11],
    [210, 420, 46, -8],
    [282, 414, 46, -4],
  ].forEach(([x, y, width, angle]) => {
    addScreenRect(world, { x: x - width / 2, y: y - 1.6, width, height: 3.2 }, 49.7, screenMaterial(yellow, { opacity: 0.76 }), {
      angleDegrees: angle,
    });
  });

  [
    [18, 429, -10],
    [55, 423, -10],
    [92, 416, -9],
    [130, 410, -8],
    [168, 403, -6],
    [208, 398, -5],
  ].forEach(([x, y, angle]) => {
    addScreenRect(world, { x: x - 1.8, y: y - 13, width: 3.6, height: 18 }, 50, screenMaterial('#f7fbff', { opacity: 0.84 }), {
      angleDegrees: angle,
    });
    addScreenRect(world, { x: x - 6, y: y - 15, width: 12, height: 3 }, 50.1, screenMaterial('#ef9d5c', { opacity: 0.82 }), {
      angleDegrees: angle,
    });
  });
};

const addMeasuredSidewalkIslands = (world) => {
  [
    {
      color: '#d7d4c8',
      opacity: 0.74,
      points: [
        [0, 374],
        [118, 350],
        [235, 366],
        [194, 401],
        [56, 406],
        [0, 394],
      ],
    },
    {
      color: '#ece3d6',
      opacity: 0.7,
      points: [
        [230, 356],
        [356, 358],
        [506, 386],
        [452, 416],
        [290, 398],
        [212, 376],
      ],
    },
    {
      color: '#d7d4c8',
      opacity: 0.68,
      points: [
        [690, 384],
        [790, 356],
        [930, 337],
        [1058, 322],
        [1058, 358],
        [914, 384],
        [760, 407],
      ],
    },
    {
      color: '#6aa44f',
      opacity: 0.38,
      points: [
        [44, 384],
        [130, 365],
        [194, 375],
        [174, 395],
        [74, 398],
      ],
    },
    {
      color: '#72aa52',
      opacity: 0.32,
      points: [
        [842, 362],
        [1010, 336],
        [1058, 344],
        [1058, 382],
        [900, 390],
      ],
    },
  ].forEach(({ color, opacity, points }, index) => {
    addScreenPolygon(world, points, 42.2 + index * 0.05, screenMaterial(color, { opacity }));
    addMeasuredRoadLine(world, points.slice(0, 4), 2.4, 42.9 + index * 0.05, '#f7fbff', { divisions: 24, opacity: 0.32 });
  });
};

const addMeasuredBridgeForegroundDetails = (world) => {
  addScreenPolygon(
    world,
    [
      [0, 420],
      [224, 386],
      [462, 433],
      [438, 458],
      [204, 412],
      [0, 445],
    ],
    50.2,
    screenMaterial('#2f3942', { opacity: 0.94 })
  );
  addScreenPolygon(
    world,
    [
      [0, 450],
      [204, 414],
      [438, 459],
      [493, 522],
      [0, 522],
    ],
    50.05,
    screenMaterial('#697784', { opacity: 0.6 })
  );
  [
    [[0, 414], [224, 384], [462, 432]],
    [[0, 439], [216, 402], [438, 448]],
  ].forEach((points, index) => {
    addMeasuredRoadLine(world, points, index === 0 ? 4.4 : 3.2, 51 + index * 0.1, index === 0 ? '#f7fbff' : '#efb081', {
      divisions: 34,
      opacity: index === 0 ? 0.92 : 0.78,
    });
  });
  [
    [22, 421, -9, 0.82],
    [58, 416, -9, 0.78],
    [96, 410, -8, 0.74],
    [136, 404, -7, 0.7],
    [176, 398, -6, 0.66],
    [216, 394, -5, 0.62],
    [260, 401, 2, 0.56],
    [304, 410, 6, 0.52],
    [348, 419, 8, 0.48],
  ].forEach(([x, y, angle, scale]) => {
    addScreenRect(world, { x: x - 2 * scale, y: y - 13 * scale, width: 4 * scale, height: 18 * scale }, 52, screenMaterial('#f7fbff', { opacity: 0.9 }), {
      angleDegrees: angle,
    });
    addScreenRect(world, { x: x - 6 * scale, y: y - 15 * scale, width: 12 * scale, height: 3 * scale }, 52.1, screenMaterial('#ef9d5c', { opacity: 0.86 }), {
      angleDegrees: angle,
    });
  });
  [
    [[70, 438], [121, 427], [111, 436], [153, 433], [148, 443], [106, 446], [116, 454]],
    [[184, 410], [229, 408], [218, 415], [259, 420], [252, 428], [211, 423], [219, 432]],
  ].forEach((points) => addScreenPolygon(world, points, 52.2, screenMaterial('#f7fbff', { opacity: 0.78 })));
  [
    [[0, 468], [132, 444], [204, 522]],
    [[0, 492], [166, 462], [232, 522]],
  ].forEach((points) => addMeasuredRoadLine(world, points, 3.4, 52.3, '#62e4ff', { divisions: 28, opacity: 0.62 }));
};

const addMeasuredBridgeReferencePolish = (world) => {
  addScreenPolygon(
    world,
    [
      [0, 421],
      [222, 386],
      [463, 432],
      [453, 446],
      [220, 402],
      [0, 438],
    ],
    58.2,
    screenMaterial('#4e5a64', { opacity: 0.62 })
  );
  addScreenPolygon(
    world,
    [
      [0, 438],
      [219, 402],
      [453, 447],
      [487, 484],
      [224, 429],
      [0, 464],
    ],
    58.1,
    screenMaterial('#8d98a2', { opacity: 0.42 })
  );
  [
    [[0, 420], [224, 386], [463, 432]],
    [[0, 437], [220, 402], [452, 446]],
    [[0, 462], [224, 428], [486, 482]],
  ].forEach((points, index) => {
    addMeasuredRoadLine(world, points, index === 0 ? 4.6 : 3.2, 59 + index * 0.12, index === 0 ? '#f7fbff' : '#efb081', {
      divisions: 34,
      opacity: index === 0 ? 0.88 : 0.68,
    });
  });
  [
    [18, 423, -9, 0.82],
    [52, 418, -9, 0.78],
    [88, 412, -8, 0.74],
    [126, 407, -8, 0.7],
    [166, 401, -7, 0.66],
    [208, 397, -5, 0.62],
    [252, 403, 1, 0.58],
    [296, 411, 5, 0.54],
    [342, 420, 7, 0.5],
    [386, 430, 9, 0.46],
  ].forEach(([x, y, angle, scale]) => {
    addScreenRect(world, { x: x - 2 * scale, y: y - 14 * scale, width: 4 * scale, height: 19 * scale }, 60, screenMaterial('#f7fbff', { opacity: 0.92 }), {
      angleDegrees: angle,
    });
    addScreenRect(world, { x: x - 7 * scale, y: y - 16 * scale, width: 14 * scale, height: 3.4 * scale }, 60.1, screenMaterial('#ef9d5c', { opacity: 0.9 }), {
      angleDegrees: angle,
    });
  });
  [
    [[0, 462], [126, 439], [205, 522]],
    [[0, 491], [166, 461], [226, 522]],
    [[40, 482], [126, 465], [176, 522]],
  ].forEach((points, index) => {
    addMeasuredRoadLine(world, points, index === 0 ? 3.6 : 2.8, 60.4 + index * 0.1, index === 1 ? '#f7fbff' : CITY3D_PALETTE.cyan, {
      divisions: 34,
      opacity: index === 1 ? 0.3 : 0.5,
    });
  });
};

const addMeasuredPortalGlowSpills = (world) => {
  const glowPolygons = {
    gym: [[92, 357], [153, 357], [185, 394], [58, 397]],
    food: [[288, 342], [348, 342], [384, 373], [250, 374]],
    lab: [[438, 334], [493, 334], [528, 374], [410, 374]],
    clinic: [[748, 352], [810, 352], [845, 386], [716, 386]],
    garage: [[942, 369], [1014, 369], [1058, 407], [902, 407]],
  };

  Object.entries(glowPolygons).forEach(([key, points]) => {
    const style = DISTRICT_SCREEN_DATA[key];
    addScreenPolygon(world, points, 43.2, screenMaterial(style.accent, { opacity: 0.12 }));
    const portal = plazaReferenceSpec.landmarks[key].portal;
    addScreenEllipse(
      world,
      {
        x: portal.x - portal.width * 0.32,
        y: portal.y + portal.height * 0.54,
        width: portal.width * 1.64,
        height: portal.height * 0.52,
      },
      43.4,
      screenMaterial(style.accent, { opacity: 0.16 })
    );
  });
};

const addMeasuredPortalFinalRims = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-portal-final-rims';

  DISTRICT_ORDER.forEach((key) => {
    const target = plazaReferenceSpec.landmarks[key];
    const style = DISTRICT_SCREEN_DATA[key];
    if (!target || !style) return;

    const { portal } = target;
    const left = portal.x + portal.width * 0.16;
    const right = portal.x + portal.width * 0.84;
    const cx = portal.x + portal.width / 2;
    const spring = portal.y + portal.height * 0.52;
    const top = portal.y + portal.height * 0.14;
    const bottom = portal.y + portal.height * 0.94;
    const arch = [
      [left, bottom],
      [left, spring],
    ];

    for (let index = 1; index <= 18; index += 1) {
      const t = index / 18;
      const x = (1 - t) * (1 - t) * left + 2 * (1 - t) * t * cx + t * t * right;
      const y = (1 - t) * (1 - t) * spring + 2 * (1 - t) * t * top + t * t * spring;
      arch.push([x, y]);
    }
    arch.push([right, bottom]);

    addScreenEllipse(
      group,
      {
        x: portal.x + portal.width * 0.16,
        y: portal.y + portal.height * 0.44,
        width: portal.width * 0.68,
        height: portal.height * 0.52,
      },
      114,
      screenMaterial('#061522', { depthTest: false, depthWrite: false, opacity: 0.42 }),
      { renderOrder: 126 }
    );
    addMeasuredRoadLine(group, arch, Math.max(6, portal.width * 0.13), 114.2, style.accent, {
      divisions: 32,
      opacity: 0.82,
    });
    addMeasuredRoadLine(group, arch, Math.max(2, portal.width * 0.045), 114.32, '#f7fbff', {
      divisions: 32,
      opacity: 0.54,
    });
    addScreenEllipse(
      group,
      {
        x: portal.x - portal.width * 0.14,
        y: portal.y + portal.height * 0.78,
        width: portal.width * 1.28,
        height: portal.height * 0.28,
      },
      114.36,
      screenMaterial(style.accent, { depthTest: false, depthWrite: false, opacity: 0.18 }),
      { renderOrder: 127 }
    );
  });

  world.add(group);
};

const createRoadLayerTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = PLAZA_SCREEN.width;
  canvas.height = PLAZA_SCREEN.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const drawPolygon = (points, fillStyle) => {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };
  const drawPath = (points, strokeStyle, width, dash = []) => {
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.restore();
  };
  const drawTaperedPath = (points, fillStyle, startWidth, endWidth = startWidth) => {
    const left = [];
    const right = [];
    points.forEach(([x, y], index) => {
      const prev = points[Math.max(0, index - 1)];
      const next = points[Math.min(points.length - 1, index + 1)];
      const dx = next[0] - prev[0];
      const dy = next[1] - prev[1];
      const length = Math.max(0.001, Math.hypot(dx, dy));
      const nx = -dy / length;
      const ny = dx / length;
      const t = points.length <= 1 ? 0 : index / (points.length - 1);
      const width = startWidth + (endWidth - startWidth) * t;
      left.push([x + nx * width * 0.5, y + ny * width * 0.5]);
      right.push([x - nx * width * 0.5, y - ny * width * 0.5]);
    });
    drawPolygon([...left, ...right.reverse()], fillStyle);
  };

  drawPolygon(plazaReferenceSpec.water.polygon, '#087fa8');
  drawPath(
    [
      [0, 455],
      [154, 430],
      [232, 522],
    ],
    'rgba(107, 236, 255, 0.45)',
    5
  );
  drawPath(
    [
      [0, 488],
      [180, 456],
      [238, 522],
    ],
    'rgba(255, 255, 255, 0.24)',
    3
  );
  drawPolygon(plazaReferenceSpec.bridge.deckPolygon, '#7f8a95');
  drawPolygon(plazaReferenceSpec.bridge.railPolygon, '#eef3ec');
  drawPath(
    [
      [0, 431],
      [220, 394],
      [456, 438],
    ],
    '#f7fbff',
    4
  );
  drawPath(
    [
      [0, 448],
      [218, 410],
      [435, 452],
    ],
    'rgba(7, 18, 28, 0.35)',
    5
  );

  const roadDrawOrder = ['backbone', 'leftFeeder', 'rightFeeder', 'midArc', 'bridgeApproach', 'foregroundArc'];
  roadDrawOrder.forEach((id) => {
    const road = plazaReferenceSpec.roads.find((item) => item.id === id);
    if (!road) return;
    if (id === 'backbone') {
      drawTaperedPath(road.polyline, 'rgba(237, 231, 215, 0.66)', road.width * 0.32 + 6, road.width * 0.68 + 14);
      drawTaperedPath(road.polyline, '#323b44', road.width * 0.26, road.width * 0.66);
    } else {
      drawPath(road.polyline, '#ede7d7', road.width + (id === 'foregroundArc' ? 30 : 20));
      drawPath(road.polyline, '#37414a', road.width);
    }
    if (id !== 'bridgeApproach') {
      drawPath(road.polyline, id === 'backbone' ? 'rgba(247,251,255,0.68)' : 'rgba(255,211,79,0.72)', 3, [18, 28]);
    }
  });

  const outer = plazaReferenceSpec.roundabout.outerEllipse;
  ctx.fillStyle = '#e9e4d3';
  ctx.beginPath();
  ctx.ellipse(
    outer.x + outer.width / 2,
    outer.y + outer.height / 2,
    outer.width / 2,
    outer.height / 2,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.fillStyle = '#37414a';
  ctx.beginPath();
  ctx.ellipse(
    outer.x + outer.width / 2,
    outer.y + outer.height / 2,
    outer.width / 2 - 24,
    outer.height / 2 - 16,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  const island = plazaReferenceSpec.roundabout.innerIsland;
  ctx.fillStyle = '#cdd8d8';
  ctx.beginPath();
  ctx.ellipse(
    island.x + island.width / 2,
    island.y + island.height / 2,
    island.width / 2,
    island.height / 2,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  plazaReferenceSpec.roundabout.ringMarkings.forEach((box, index) => {
    ctx.strokeStyle = index === 0 ? 'rgba(247, 251, 255, 0.74)' : 'rgba(70, 217, 239, 0.56)';
    ctx.lineWidth = index === 0 ? 3 : 2;
    ctx.beginPath();
    ctx.ellipse(box.x + box.width / 2, box.y + box.height / 2, box.width / 2, box.height / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  });

  plazaReferenceSpec.crosswalks.forEach((crosswalk) => {
    const stripeCount = Math.max(5, Math.floor(crosswalk.box.width / 12));
    ctx.save();
    ctx.translate(crosswalk.box.x + crosswalk.box.width / 2, crosswalk.box.y + crosswalk.box.height / 2);
    ctx.rotate((crosswalk.angleDegrees * Math.PI) / 180);
    ctx.fillStyle = 'rgba(247, 251, 255, 0.9)';
    for (let index = 0; index < stripeCount; index += 1) {
      const x = -crosswalk.box.width / 2 + index * (crosswalk.box.width / stripeCount);
      ctx.fillRect(x, -crosswalk.box.height * 0.33, crosswalk.box.width / (stripeCount * 1.8), crosswalk.box.height * 0.66);
    }
    ctx.restore();
  });

  [
    [880, 476, 26, 8],
    [946, 492, 25, 10],
    [398, 416, 20, 8],
    [506, 452, 32, 8],
    [706, 390, 30, -10],
    [336, 399, 36, -8],
  ].forEach(([x, y, width, angle]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.fillStyle = 'rgba(255, 211, 79, 0.82)';
    ctx.fillRect(-width / 2, -1.5, width, 3);
    ctx.restore();
  });

  for (let index = 0; index < 170; index += 1) {
    const x = (index * 67 + 31) % canvas.width;
    const y = 322 + ((index * 43 + 17) % 188);
    if ((x > 118 && x < 266 && y > 230 && y < 374) || (x > 868 && x < 1058 && y < 390)) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((((index % 13) - 6) * Math.PI) / 90);
    ctx.fillStyle = index % 5 === 0 ? 'rgba(247, 251, 255, 0.26)' : 'rgba(5, 14, 22, 0.2)';
    ctx.fillRect(-8 - (index % 4), -1, 12 + (index % 5) * 5, 2);
    ctx.restore();
  }
  for (let index = 0; index < 34; index += 1) {
    const x = 38 + ((index * 89) % 980);
    const y = 366 + ((index * 37) % 124);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((((index % 9) - 4) * Math.PI) / 48);
    ctx.fillStyle = index % 2 ? 'rgba(255, 211, 79, 0.56)' : 'rgba(247, 251, 255, 0.48)';
    ctx.fillRect(-9, -1.3, 18 + (index % 4) * 8, 2.6);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const createPlazaDetailLayerTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = PLAZA_SCREEN.width;
  canvas.height = PLAZA_SCREEN.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const poly = (points, fillStyle) => {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };

  const path = (points, strokeStyle, width, dash = []) => {
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.restore();
  };

  const rect = (x, y, width, height, color, angle = 0, alpha = 1) => {
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(-width / 2, -height / 2, width, height);
    ctx.restore();
  };

  poly(
    [
      [574, 206],
      [636, 204],
      [674, 356],
      [640, 392],
      [558, 386],
      [536, 356],
    ],
    'rgba(42, 50, 57, 0.34)'
  );
  path(
    [
      [602, 178],
      [604, 226],
      [605, 286],
      [604, 354],
      [604, 398],
    ],
    'rgba(247, 251, 255, 0.5)',
    2.2,
    [16, 21]
  );
  path(
    [
      [568, 196],
      [578, 254],
      [590, 326],
      [598, 390],
    ],
    'rgba(255, 211, 79, 0.46)',
    2.1,
    [14, 26]
  );
  path(
    [
      [640, 196],
      [630, 254],
      [618, 326],
      [610, 390],
    ],
    'rgba(255, 211, 79, 0.46)',
    2.1,
    [14, 26]
  );
  path(
    [
      [522, 338],
      [570, 372],
      [604, 398],
      [650, 374],
      [704, 338],
    ],
    'rgba(247, 251, 255, 0.32)',
    4,
    [18, 16]
  );

  path(
    [
      [0, 304],
      [152, 286],
      [318, 296],
      [486, 286],
      [650, 292],
      [828, 278],
      [1058, 292],
    ],
    'rgba(238, 230, 207, 0.48)',
    7
  );
  path(
    [
      [0, 318],
      [166, 302],
      [332, 312],
      [494, 304],
      [664, 308],
      [832, 296],
      [1058, 306],
    ],
    'rgba(50, 59, 67, 0.62)',
    10
  );
  [
    [18, 266, 34, 28, '#6f8793'],
    [62, 258, 31, 34, '#a9c27a'],
    [102, 262, 42, 27, '#e6a65a'],
    [158, 254, 36, 38, '#5b9bb7'],
    [205, 266, 39, 27, '#d66a55'],
    [248, 256, 34, 36, '#e0c26d'],
    [318, 262, 40, 31, '#5a85a3'],
    [362, 252, 32, 42, '#7b5fc5'],
    [522, 258, 38, 31, '#d76a54'],
    [664, 252, 43, 35, '#5b9a75'],
    [804, 252, 36, 39, '#e1bd66'],
    [854, 258, 42, 32, '#5f88a0'],
    [946, 252, 38, 38, '#d96b58'],
    [1000, 244, 46, 45, '#6d8fa5'],
  ].forEach(([x, y, width, height, color], index) => {
    rect(x + 3, y + 4, width, height, 'rgba(4, 12, 22, 0.16)', 0, 1);
    rect(x, y, width, height, color, 0, 0.62);
    rect(x + 3, y - 4, width - 6, 6, '#f3dfb6', 0, 0.58);
    for (let wy = y + 9; wy < y + height - 5; wy += 12) {
      for (let wx = x + 6; wx < x + width - 5; wx += 11) {
        if ((Math.floor(wx + wy) + index) % 3 !== 0) rect(wx, wy, 3, 4, '#dff8ff', 0, 0.32);
      }
    }
  });

  [
    [74, 335, 34, 18, '#6e8895'],
    [126, 326, 30, 16, '#e6ad59'],
    [186, 324, 38, 19, '#5f9bb4'],
    [248, 328, 34, 17, '#d96a4f'],
    [344, 334, 42, 20, '#617f91'],
    [532, 314, 33, 18, '#d77b4d'],
    [662, 316, 36, 17, '#67a36a'],
    [814, 320, 40, 19, '#d7ae59'],
    [944, 316, 42, 20, '#60879f'],
    [1002, 306, 36, 18, '#df735e'],
  ].forEach(([x, y, width, height, color], index) => {
    rect(x, y, width, height, 'rgba(4, 12, 22, 0.18)', -4 + (index % 5), 1);
    rect(x + 1, y - 2, width, height, color, -4 + (index % 5), 0.82);
    rect(x + 4, y - 5, width - 8, 4, '#f4e6c6', -4 + (index % 5), 0.8);
  });

  [
    [61, 365],
    [96, 358],
    [138, 351],
    [188, 346],
    [246, 350],
    [332, 362],
    [392, 370],
    [492, 366],
    [690, 350],
    [752, 342],
    [826, 336],
    [912, 330],
    [985, 342],
    [1030, 356],
    [454, 430],
    [520, 420],
    [680, 412],
    [760, 406],
    [858, 412],
    [952, 426],
  ].forEach(([x, y], index) => {
    const scale = 0.46 + (index % 4) * 0.07;
    rect(x - 1.4 * scale, y - 12 * scale, 2.8 * scale, 12 * scale, '#6f4a28', 0, 0.78);
    poly(
      [
        [x, y - 31 * scale],
        [x + 15 * scale, y + 1 * scale],
        [x - 17 * scale, y + 3 * scale],
      ],
      index % 2 ? 'rgba(112, 151, 33, 0.78)' : 'rgba(148, 177, 45, 0.76)'
    );
  });

  [
    [334, 386, 25, 10, '#ef4334', -10],
    [402, 378, 22, 9, '#2cc8ff', -7],
    [690, 368, 22, 9, '#f3a12f', -13],
    [842, 362, 23, 9, '#ef4334', -11],
    [924, 382, 24, 10, '#2cc8ff', 7],
    [508, 342, 18, 8, '#ef4334', 0],
  ].forEach(([x, y, width, height, color, angle]) => {
    rect(x, y + 2, width, height, 'rgba(4, 12, 22, 0.32)', angle, 1);
    rect(x, y, width, height, color, angle, 0.88);
    rect(x + width * 0.35, y - 2, width * 0.32, height * 0.44, '#dff8ff', angle, 0.7);
  });

  for (let index = 0; index < 58; index += 1) {
    const x = 22 + ((index * 73) % 1010);
    const y = 344 + ((index * 41) % 162);
    if ((x > 520 && x < 690 && y > 350 && y < 430) || (x > 70 && x < 190 && y < 392)) continue;
    const angle = -18 + (index % 13) * 3;
    const color = index % 4 === 0 ? 'rgba(247, 251, 255, 0.32)' : 'rgba(255, 211, 79, 0.34)';
    rect(x, y, 18 + (index % 4) * 8, 2.4, color, angle, 1);
  }

  [
    [0, 428],
    [60, 417],
    [120, 407],
    [180, 397],
    [240, 390],
    [300, 395],
    [360, 408],
    [420, 424],
  ].forEach(([x, y], index) => {
    rect(x + 3, y - 8, 3, 18, '#f7fbff', -11 + index, 0.84);
    rect(x - 6, y - 10, 18, 3, index % 2 ? '#ef9d5c' : '#f7fbff', -11 + index, 0.82);
  });

  path(
    [
      [0, 414],
      [226, 384],
      [462, 432],
    ],
    'rgba(239, 157, 92, 0.72)',
    3.5
  );
  path(
    [
      [0, 437],
      [218, 402],
      [454, 448],
    ],
    'rgba(247, 251, 255, 0.58)',
    2.5,
    [18, 18]
  );
  path(
    [
      [0, 463],
      [132, 441],
      [206, 522],
    ],
    'rgba(95, 229, 255, 0.38)',
    2.5
  );
  path(
    [
      [0, 492],
      [168, 462],
      [232, 522],
    ],
    'rgba(247, 251, 255, 0.26)',
    2.2
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const addMeasuredTree = (world, x, y, scale = 1) => {
  addScreenRect(world, { x: x - 3 * scale, y: y, width: 6 * scale, height: 22 * scale }, 55, screenMaterial('#8a562d'));
  addScreenPolygon(
    world,
    [
      [x, y - 30 * scale],
      [x + 26 * scale, y + 8 * scale],
      [x - 24 * scale, y + 10 * scale],
    ],
    56,
    screenMaterial('#6b8d22')
  );
  addScreenPolygon(
    world,
    [
      [x + 3 * scale, y - 41 * scale],
      [x + 22 * scale, y - 4 * scale],
      [x - 13 * scale, y - 1 * scale],
    ],
    57,
    screenMaterial('#a6c73b')
  );
};

const addMeasuredLamp = (world, x, y, scale = 1) => {
  addScreenRect(world, { x: x - 1.4 * scale, y: y - 24 * scale, width: 2.8 * scale, height: 24 * scale }, 60, screenMaterial('#22313b'));
  addScreenRect(world, { x: x - 7 * scale, y: y - 26 * scale, width: 14 * scale, height: 3 * scale }, 61, screenMaterial('#f7fbff', { opacity: 0.86 }));
  addScreenEllipse(world, { x: x - 8 * scale, y: y - 31 * scale, width: 16 * scale, height: 10 * scale }, 62, screenMaterial(CITY3D_PALETTE.roadLine, { opacity: 0.28 }));
};

const addMeasuredCar = (world, x, y, color, angle = 0, scale = 1) => {
  addScreenRect(world, { x: x - 12 * scale, y: y - 5 * scale, width: 24 * scale, height: 10 * scale }, 43, screenMaterial('#0b1019', { opacity: 0.42 }), {
    angleDegrees: angle,
  });
  addScreenRect(world, { x: x - 10 * scale, y: y - 8 * scale, width: 20 * scale, height: 10 * scale }, 44, screenMaterial(color), {
    angleDegrees: angle,
  });
  addScreenRect(world, { x: x - 4 * scale, y: y - 11 * scale, width: 9 * scale, height: 5 * scale }, 45, screenMaterial('#dff8ff', { opacity: 0.84 }), {
    angleDegrees: angle,
  });
  [-1, 1].forEach((side) => {
    addScreenEllipse(world, { x: x + side * 7 * scale - 2 * scale, y: y + 1 * scale, width: 4 * scale, height: 4 * scale }, 46, screenMaterial('#0b1019'));
  });
};

const addMeasuredBarrier = (world, x, y, angle = 0, scale = 1) => {
  addScreenRect(world, { x: x - 12 * scale, y: y - 2 * scale, width: 24 * scale, height: 4 * scale }, 48, screenMaterial('#f7fbff'), {
    angleDegrees: angle,
  });
  addScreenRect(world, { x: x - 9 * scale, y: y - 1.5 * scale, width: 6 * scale, height: 3 * scale }, 49, screenMaterial(CITY3D_PALETTE.clinic), {
    angleDegrees: angle,
  });
  addScreenRect(world, { x: x + 3 * scale, y: y - 1.5 * scale, width: 6 * scale, height: 3 * scale }, 49, screenMaterial(CITY3D_PALETTE.clinic), {
    angleDegrees: angle,
  });
};

const addMeasuredForegroundDensity = (world) => {
  addScreenPolygon(
    world,
    [
      [804, 445],
      [958, 443],
      [1058, 464],
      [1058, 522],
      [872, 522],
      [827, 488],
    ],
    34.2,
    screenMaterial('#303a43', { opacity: 0.84 })
  );
  addScreenPolygon(
    world,
    [
      [608, 452],
      [744, 436],
      [889, 454],
      [818, 484],
      [641, 477],
    ],
    34.6,
    screenMaterial('#e6e0cf', { opacity: 0.9 })
  );
  addScreenPolygon(
    world,
    [
      [684, 482],
      [832, 468],
      [1058, 497],
      [1058, 522],
      [730, 522],
    ],
    35,
    screenMaterial('#4f5b64', { opacity: 0.94 })
  );
  addScreenPolygon(
    world,
    [
      [560, 462],
      [708, 448],
      [872, 475],
      [960, 522],
      [604, 522],
    ],
    35.05,
    screenMaterial('#626e76', { opacity: 0.72 })
  );
  addScreenPolygon(
    world,
    [
      [848, 486],
      [980, 494],
      [1058, 510],
      [1058, 522],
      [914, 522],
    ],
    35.1,
    screenMaterial('#68a94f', { opacity: 0.42 })
  );
  addScreenPolygon(
    world,
    [
      [0, 468],
      [184, 434],
      [401, 479],
      [493, 522],
      [0, 522],
    ],
    35.2,
    screenMaterial('#697784', { opacity: 0.62 })
  );
  [
    [693, 445, 68, -8],
    [776, 437, 74, -2],
    [873, 443, 80, 7],
    [968, 461, 78, 12],
    [759, 506, 92, 0],
    [861, 506, 94, 4],
    [654, 486, 88, -3],
    [750, 493, 96, 3],
  ].forEach(([x, y, width, angle]) => {
    addScreenRect(world, { x: x - width / 2, y: y - 1.5, width, height: 3 }, 36.2, screenMaterial(CITY3D_PALETTE.roadLine, { opacity: 0.75 }), {
      angleDegrees: angle,
    });
  });
  [
    [34, 430, 0.54],
    [72, 423, 0.5],
    [112, 416, 0.48],
    [154, 410, 0.44],
    [198, 405, 0.42],
    [244, 411, 0.42],
    [294, 422, 0.4],
    [345, 433, 0.38],
  ].forEach(([x, y, scale]) => {
    addScreenRect(world, { x: x - 2 * scale, y: y - 10 * scale, width: 4 * scale, height: 12 * scale }, 37, screenMaterial('#24323c', { opacity: 0.7 }));
    addScreenRect(world, { x: x - 11 * scale, y: y - 14 * scale, width: 22 * scale, height: 4 * scale }, 37.2, screenMaterial('#f7fbff', { opacity: 0.82 }));
  });
  [
    [330, 468, 30, 14, '#f3a12f'],
    [362, 456, 22, 11, '#415063'],
    [406, 470, 24, 12, '#ef4334'],
    [552, 462, 26, 12, '#415063'],
    [914, 472, 26, 12, '#f3a12f'],
    [1004, 482, 24, 12, '#415063'],
  ].forEach(([x, y, width, height, color]) => {
    addScreenRect(world, { x, y, width, height }, 37.4, screenMaterial('#061522', { opacity: 0.18 }), { angleDegrees: -6 });
    addScreenRect(world, { x, y: y - 2, width, height }, 37.6, screenMaterial(color, { opacity: 0.82 }), { angleDegrees: -6 });
    addScreenRect(world, { x: x + 3, y, width: width - 6, height: 2 }, 37.8, screenMaterial('#f7fbff', { opacity: 0.42 }), {
      angleDegrees: -6,
    });
  });
};

const addMeasuredPlazaProps = (world) => {
  [
    [338, 384, '#f3a12f', -8, 0.72],
    [404, 374, '#2cc8ff', -5, 0.62],
    [686, 360, '#ef4334', -14, 0.68],
    [824, 372, '#f3a12f', -10, 0.58],
    [923, 392, '#46d9ef', 8, 0.66],
    [506, 344, '#ef4334', 0, 0.48],
  ].forEach(([x, y, color, angle, scale]) => addMeasuredCar(world, x, y, color, angle, scale));

  [
    [268, 349, 0.75],
    [426, 353, 0.72],
    [520, 377, 0.78],
    [683, 342, 0.72],
    [848, 344, 0.76],
    [974, 360, 0.86],
    [356, 452, 0.68],
    [720, 438, 0.64],
  ].forEach(([x, y, scale]) => addMeasuredLamp(world, x, y, scale));

  [
    [570, 441, -5, 0.62],
    [617, 444, 4, 0.62],
    [670, 428, 16, 0.58],
    [522, 423, -22, 0.58],
    [204, 413, -11, 0.58],
    [252, 405, -8, 0.54],
    [952, 412, 10, 0.58],
    [1006, 425, 12, 0.54],
  ].forEach(([x, y, angle, scale]) => addMeasuredBarrier(world, x, y, angle, scale));

  [
    [462, 408, 24, 9],
    [492, 414, 18, 8],
    [710, 404, 22, 8],
    [742, 398, 18, 7],
    [152, 374, 18, 7],
    [180, 370, 16, 7],
    [870, 356, 18, 7],
  ].forEach(([x, y, width, height]) => {
    addScreenRect(world, { x, y, width, height }, 41, screenMaterial('#d7d4c8', { opacity: 0.72 }));
    addScreenRect(world, { x: x + 2, y: y + 2, width: width - 4, height: 2 }, 42, screenMaterial('#f7fbff', { opacity: 0.5 }));
  });
};

const addMeasuredDistrictShadow = (world, key) => {
  const full = plazaReferenceSpec.landmarks[key].full;
  const bottom = full.y + full.height;
  const skew = key === 'garage' || key === 'clinic' ? 32 : 46;
  addScreenPolygon(
    world,
    [
      [full.x + full.width * 0.14, bottom - 24],
      [full.x + full.width * 0.92, bottom - 20],
      [full.x + full.width * 0.92 + skew, bottom + 14],
      [full.x + full.width * 0.22 + skew * 0.45, bottom + 23],
    ],
    47,
    screenMaterial('#07121f', { opacity: 0.44 })
  );
};

const addMeasuredBeacon = (world, landmarks) => {
  const group = new THREE.Group();
  group.name = 'measured-objective-beacon';
  const glow = screenMaterial(CITY3D_PALETTE.cyan, { opacity: 0.17 });
  addScreenRect(group, { x: 588, y: 0, width: 29, height: 393 }, 69.8, screenMaterial(CITY3D_PALETTE.cyan, { opacity: 0.08 }));
  addScreenRect(group, plazaReferenceSpec.beacon.beam, 70, glow);
  addScreenRect(group, { x: 597.5, y: 0, width: 7, height: 393 }, 71, screenMaterial('#bffaff', { opacity: 0.82 }));
  addScreenRect(group, { x: 601, y: 345, width: 6, height: 76 }, 73, screenMaterial('#dfffff', { opacity: 0.78 }));
  addScreenEllipse(group, plazaReferenceSpec.beacon.base, 72, screenMaterial(CITY3D_PALETTE.cyan, { opacity: 0.035 }));
  addScreenEllipse(group, { x: 548, y: 369, width: 113, height: 58 }, 73.2, screenMaterial(CITY3D_PALETTE.cyan, { opacity: 0.025 }));
  addScreenEllipse(group, { x: 564, y: 382, width: 78, height: 32 }, 73.4, screenMaterial('#f7fbff', { opacity: 0.1 }));
  addScreenEllipse(group, { x: 580, y: 389, width: 48, height: 18 }, 73.6, screenMaterial(CITY3D_PALETTE.cyan, { opacity: 0.075 }));
  addScreenRect(group, plazaReferenceSpec.beacon.badge, 76, textureMaterial(createBeaconBadgeTexture()));
  addScreenRect(group, { x: 598.5, y: 0, width: 5, height: 393 }, 96.2, screenMaterial('#dfffff', { opacity: 0.5 }));
  addScreenRect(group, plazaReferenceSpec.beacon.badge, 96.4, textureMaterial(createBeaconBadgeTexture(), { opacity: 0.88 }));
  world.add(group);
  landmarks.beacon = group;
};

const addMeasuredRoundabout = (world, landmarks) => {
  const group = new THREE.Group();
  group.name = 'measured-roundabout';
  const outer = plazaReferenceSpec.roundabout.outerEllipse;
  const center = plazaReferenceSpec.roundabout.center;
  addScreenEllipse(group, outer, 34, screenMaterial('#e8e1d1'));
  addScreenEllipse(group, { x: outer.x + 26, y: outer.y + 18, width: outer.width - 52, height: outer.height - 36 }, 35, screenMaterial('#303942'));
  addScreenEllipse(group, plazaReferenceSpec.roundabout.innerIsland, 38, screenMaterial('#d7d4c8'));
  addScreenEllipse(
    group,
    { x: 557, y: 382, width: 94, height: 34 },
    39,
    screenMaterial(CITY3D_PALETTE.cyan, { opacity: 0.08 })
  );
  plazaReferenceSpec.roundabout.ringMarkings.forEach((box, index) => {
    addScreenEllipse(group, box, 40 + index * 0.2, screenMaterial(index === 0 ? '#f7fbff' : CITY3D_PALETTE.cyan, { opacity: 0.3 }));
  });
  for (let index = 0; index < 22; index += 1) {
    const angle = -0.22 + (Math.PI * 2 * index) / 22;
    const x = center.x + Math.cos(angle) * 114;
    const y = center.y + Math.sin(angle) * 53;
    addScreenRect(
      group,
      { x: x - 9, y: y - 1.2, width: 18, height: 2.4 },
      41,
      screenMaterial(index % 2 ? '#f7fbff' : CITY3D_PALETTE.roadLine, { opacity: index % 2 ? 0.36 : 0.3 }),
      { angleDegrees: (angle * 180) / Math.PI + 90 }
    );
  }
  for (let index = 0; index < 14; index += 1) {
    const angle = 0.12 + (Math.PI * 2 * index) / 14;
    const x = center.x + Math.cos(angle) * 57;
    const y = center.y + Math.sin(angle) * 23;
    addScreenRect(
      group,
      { x: x - 5, y: y - 1.2, width: 10, height: 2.4 },
      41.4,
      screenMaterial('#f7fbff', { opacity: 0.38 }),
      { angleDegrees: (angle * 180) / Math.PI + 90 }
    );
  }
  addScreenEllipse(group, { x: 526, y: 360, width: 158, height: 72 }, 41.2, screenMaterial('#061522', { opacity: 0.08 }));
  world.add(group);
  landmarks.roundabout = group;
};

const addMeasuredRoundaboutCrispOverlay = (world) => {
  const group = new THREE.Group();
  group.name = 'measured-roundabout-crisp-overlay';
  const outer = plazaReferenceSpec.roundabout.outerEllipse;
  const island = plazaReferenceSpec.roundabout.innerIsland;
  const center = plazaReferenceSpec.roundabout.center;
  addScreenEllipse(
    group,
    { x: outer.x + 1, y: outer.y + 1, width: outer.width - 2, height: outer.height - 2 },
    66,
    screenMaterial('#e9e0cf', { depthTest: false, depthWrite: false, opacity: 0.94 })
  );
  addScreenEllipse(
    group,
    { x: outer.x + 25, y: outer.y + 17, width: outer.width - 50, height: outer.height - 34 },
    66.2,
    screenMaterial('#28313a', { depthTest: false, depthWrite: false, opacity: 0.98 })
  );
  addScreenEllipse(
    group,
    { x: island.x - 4, y: island.y - 2, width: island.width + 8, height: island.height + 4 },
    66.4,
    screenMaterial('#d9d3c4', { depthTest: false, depthWrite: false, opacity: 0.94 })
  );
  addScreenEllipse(
    group,
    { x: island.x + 10, y: island.y + 8, width: island.width - 20, height: island.height - 16 },
    66.48,
    screenMaterial('#7aa6ff', { depthTest: false, depthWrite: false, opacity: 0.2 })
  );
  addScreenEllipse(
    group,
    { x: outer.x + 10, y: outer.y + 7, width: outer.width - 20, height: outer.height - 12 },
    66.485,
    screenMaterial('#d6c5cf', { depthTest: false, depthWrite: false, opacity: 0.42 })
  );
  addScreenEllipseRingSegment(
    group,
    { x: outer.x + 2, y: outer.y + 2, width: outer.width - 4, height: outer.height - 2 },
    { x: 46, y: 24 },
    Math.PI * 0.69,
    Math.PI * 1.31,
    66.49,
    screenMaterial('#ead6bd', { depthTest: false, depthWrite: false, opacity: 0.28 }),
    { segments: 42 }
  );
  addScreenEllipseRingSegment(
    group,
    { x: outer.x + 4, y: outer.y + 4, width: outer.width - 8, height: outer.height - 2 },
    { x: 34, y: 19 },
    Math.PI * 0.08,
    Math.PI * 0.92,
    66.495,
    screenMaterial('#dfbf91', { depthTest: false, depthWrite: false, opacity: 0.3 }),
    { segments: 48 }
  );
  addScreenEllipseRingSegment(
    group,
    { x: outer.x + 5, y: outer.y + 3, width: outer.width - 10, height: outer.height - 5 },
    { x: 42, y: 23 },
    Math.PI * 1.55,
    Math.PI * 1.98,
    66.496,
    screenMaterial('#071523', { depthTest: false, depthWrite: false, opacity: 0.8 }),
    { segments: 34 }
  );
  addScreenEllipse(
    group,
    { x: island.x + 18, y: island.y + 11, width: island.width - 36, height: island.height - 22 },
    66.498,
    screenMaterial('#405eff', { depthTest: false, depthWrite: false, opacity: 0.2 })
  );
  addScreenEllipseRingSegment(
    group,
    { x: island.x - 1, y: island.y, width: island.width + 2, height: island.height + 1 },
    { x: 21, y: 9 },
    Math.PI + 0.05,
    Math.PI * 2 - 0.05,
    66.5,
    screenMaterial('#fff6df', { depthTest: false, depthWrite: false, opacity: 0.34 }),
    { segments: 44 }
  );
  addScreenEllipseRingSegment(
    group,
    { x: outer.x + 3, y: outer.y + 2, width: outer.width - 6, height: outer.height - 2 },
    { x: 24, y: 16 },
    0.05,
    Math.PI - 0.04,
    66.52,
    screenMaterial('#061522', { depthTest: false, depthWrite: false, opacity: 0.34 }),
    { segments: 58 }
  );
  addScreenEllipseRingSegment(
    group,
    { x: outer.x + 2, y: outer.y + 1, width: outer.width - 4, height: outer.height - 4 },
    { x: 20, y: 14 },
    Math.PI + 0.14,
    Math.PI * 2 - 0.08,
    66.54,
    screenMaterial('#fff4df', { depthTest: false, depthWrite: false, opacity: 0.28 }),
    { segments: 58 }
  );
  addScreenEllipseRingSegment(
    group,
    { x: island.x - 4, y: island.y - 2, width: island.width + 8, height: island.height + 5 },
    { x: 16, y: 8 },
    0.08,
    Math.PI - 0.08,
    66.56,
    screenMaterial('#071523', { depthTest: false, depthWrite: false, opacity: 0.26 }),
    { segments: 44 }
  );
  plazaReferenceSpec.roundabout.ringMarkings.forEach((box, index) => {
    addScreenEllipse(
      group,
      box,
      66.8 + index * 0.08,
      screenMaterial(index === 0 ? '#f7fbff' : CITY3D_PALETTE.cyan, {
        depthTest: false,
        depthWrite: false,
        opacity: index === 0 ? 0.72 : 0.36,
      })
    );
  });
  for (let index = 0; index < 24; index += 1) {
    const angle = -0.18 + (Math.PI * 2 * index) / 24;
    const x = center.x + Math.cos(angle) * 118;
    const y = center.y + Math.sin(angle) * 54;
    addScreenRect(
      group,
      { x: x - 9, y: y - 1.3, width: 18, height: 2.6 },
      67.1,
      screenMaterial(index % 2 ? '#f7fbff' : CITY3D_PALETTE.roadLine, {
        depthTest: false,
        depthWrite: false,
        opacity: index % 2 ? 0.68 : 0.52,
      }),
      { angleDegrees: (angle * 180) / Math.PI + 90 }
    );
  }
  world.add(group);
};

const addMeasuredPlazaScene = (scene) => {
  scene.background = createSkyTexture();
  scene.fog = null;
  addLights(scene);

  const landmarks = {};
  const world = new THREE.Group();
  world.name = 'measured-plaza-world';
  world.userData.landmarks = landmarks;
  world.userData.roadCurves = {};
  scene.add(world);

  addScreenRect(world, { x: 0, y: 188, width: 1058, height: 334 }, 0, textureMaterial(createGroundTexture(), { opacity: 1 }));
  addMeasuredMountainsAndClouds(world, landmarks);
  addMeasuredSkyline(world, landmarks);
  addScreenRect(world, { x: 0, y: 0, width: PLAZA_SCREEN.width, height: PLAZA_SCREEN.height }, 12, textureMaterial(createSkylineLayerTexture(), { opacity: 0.64 }));
  addTracedPlazaShapeLayer(world, 'skylineTowerFacets', { opacityScale: 0.95 });
  addScreenRect(world, { x: 0, y: 0, width: PLAZA_SCREEN.width, height: PLAZA_SCREEN.height }, 18.8, textureMaterial(createSkylineDepthLayerTexture(), { opacity: 0.58 }));
  addMeasuredLowerSkylineMassing(world);
  addScreenRect(world, { x: 0, y: 0, width: PLAZA_SCREEN.width, height: PLAZA_SCREEN.height }, 19.4, textureMaterial(createLowerSkylineCorrectionTexture()));
  addMeasuredSkylineFineDetail(world);
  addMeasuredSkylineCrispTopPass(world);
  addTracedPlazaShapeLayer(world, 'referenceSkylineFacets');
  addTracedPlazaFineFacetLayer(world, 'referenceSkylineFineFacets', {
    opacity: 1,
    opacityScale: 6,
    renderOrder: 73,
    z: 19.7,
  });

  const midMats = ['#526f80', '#ee9550', '#4f88ad', '#7655c5', '#d9695a', '#efd28c', '#4ba36e'];
  for (let index = 0; index < 70; index += 1) {
    const width = 18 + (index % 5) * 8;
    const height = 22 + ((index * 11) % 54);
    const x = 12 + (index % 26) * 41 + ((index * 7) % 11);
    const y = 210 + Math.floor(index / 26) * 32 - height * 0.42;
    if (x > 50 && x < 1040 && y > 215 && y < 360 && index % 4 === 0) continue;
    addScreenRect(world, { x, y, width, height }, 13, screenMaterial(midMats[index % midMats.length], { opacity: 0.86 }));
    addScreenRect(world, { x: x + 2, y: y - 4, width: width - 4, height: 6 }, 13.2, screenMaterial('#f2e8cf', { opacity: 0.8 }));
    for (let wy = y + 10; wy < y + height - 7; wy += 13) {
      for (let wx = x + 5; wx < x + width - 5; wx += 9) {
        if ((Math.floor(wx + wy) + index) % 4 === 0) continue;
        addScreenRect(world, { x: wx, y: wy, width: 3, height: 4.5 }, 13.4, screenMaterial('#dff8ff', { opacity: 0.42 }));
      }
    }
    if (index % 6 === 1) {
      addScreenRect(world, { x: x + width * 0.24, y: y - 10, width: width * 0.52, height: 4 }, 13.5, screenMaterial(CITY3D_PALETTE.roadLine, { opacity: 0.45 }));
    }
  }
  addTracedPlazaShapeLayer(world, 'midgroundCityFacets', { opacityScale: 0.55 });
  addTracedPlazaShapeLayer(world, 'referenceMidgroundFacets', { opacityScale: 1.7 });
  addTracedPlazaFineFacetLayer(world, 'referenceMidgroundFineFacets', {
    opacity: 1,
    opacityScale: 8,
    renderOrder: 85,
    z: 20.6,
  });

  addScreenPolygon(
    world,
    [
      [0, 282],
      [120, 260],
      [270, 268],
      [420, 258],
      [592, 262],
      [760, 254],
      [916, 263],
      [1058, 246],
      [1058, 356],
      [912, 344],
      [760, 352],
      [610, 344],
      [444, 354],
      [282, 342],
      [138, 352],
      [0, 366],
    ],
    14,
    screenMaterial('#58636b', { opacity: 0.62 })
  );
  addScreenPolygon(
    world,
    [
      [0, 318],
      [168, 300],
      [330, 309],
      [494, 300],
      [655, 304],
      [804, 294],
      [1058, 306],
      [1058, 338],
      [814, 328],
      [660, 337],
      [492, 331],
      [334, 338],
      [166, 329],
      [0, 346],
    ],
    15,
    screenMaterial('#303942', { opacity: 0.78 })
  );
  [
    [52, 292, 42, 20, '#d7d4c8'],
    [118, 286, 38, 18, '#e28d47'],
    [182, 282, 50, 24, '#4f88ad'],
    [525, 282, 44, 22, '#d76655'],
    [662, 278, 52, 23, '#3a8e62'],
    [842, 284, 44, 21, '#f0d38f'],
    [1004, 278, 46, 24, '#526b7e'],
  ].forEach(([x, y, width, height, color]) => {
    addScreenRect(world, { x, y, width, height }, 18, screenMaterial(color, { opacity: 0.86 }));
    addScreenRect(world, { x: x + 3, y: y - 4, width: width - 6, height: 5 }, 18.2, screenMaterial('#f2e8cf', { opacity: 0.82 }));
  });

  const roadMaterials = {
    asphalt: screenMaterial('#3b454d'),
    curb: screenMaterial('#e9e4d3'),
    line: screenMaterial(CITY3D_PALETTE.roadLine, { opacity: 0.9 }),
  };
  const roadOrder = ['backbone', 'leftFeeder', 'rightFeeder', 'midArc', 'bridgeApproach', 'foregroundArc'];
  roadOrder.forEach((id) => {
    const road = plazaReferenceSpec.roads.find((item) => item.id === id);
    if (road) {
      addScreenRoad(world, road, roadMaterials, {
        centerLine: id !== 'foregroundArc' && id !== 'bridgeApproach',
        curbWidth: id === 'foregroundArc' ? 28 : 18,
        curbWidthEnd: id === 'backbone' ? 14 : undefined,
        curbWidthStart: id === 'backbone' ? 6 : undefined,
        divisions: id.includes('Arc') ? 120 : 70,
        endScale: id === 'backbone' ? 0.66 : undefined,
        startScale: id === 'backbone' ? 0.26 : undefined,
        z: id === 'foregroundArc' ? 25 : 20,
      });
    }
  });

  addScreenPolygon(world, plazaReferenceSpec.water.polygon, 26, screenMaterial('#087fa8', { opacity: 0.9 }));
  [
    [[0, 452], [142, 430], [162, 434], [0, 462]],
    [[0, 486], [176, 456], [196, 462], [0, 496]],
  ].forEach((points) => addScreenPolygon(world, points, 27, screenMaterial(CITY3D_PALETTE.cyan, { opacity: 0.24 })));
  addScreenPolygon(world, plazaReferenceSpec.bridge.deckPolygon, 31, screenMaterial('#7a8693'));
  addScreenPolygon(world, plazaReferenceSpec.bridge.railPolygon, 46, screenMaterial('#e7eee8'));
  addScreenPolygon(world, [[0, 486], [186, 444], [420, 494], [472, 522], [0, 522]], 45, screenMaterial('#66717d', { opacity: 0.6 }));
  addScreenPolygon(world, [[0, 442], [138, 421], [232, 522], [0, 522]], 45.4, screenMaterial('#086f98', { opacity: 0.5 }));
  [
    [[0, 456], [124, 435], [200, 522]],
    [[0, 490], [156, 462], [220, 522]],
  ].forEach((points) => addMeasuredRoadLine(world, points, 3, 46, CITY3D_PALETTE.cyan, { divisions: 24, opacity: 0.46 }));
  [
    [[0, 430], [222, 394], [454, 438]],
    [[0, 448], [218, 410], [435, 452]],
  ].forEach((points) => addMeasuredRoadLine(world, points, 3, 47, '#f7fbff', { divisions: 28, opacity: 0.9 }));
  addMeasuredRoadLine(world, [[6, 417], [224, 386], [462, 433]], 4, 49, '#efb081', { divisions: 30, opacity: 0.78 });
  addMeasuredRoadLine(world, [[0, 438], [220, 405], [438, 449]], 3, 49, '#061522', { divisions: 30, opacity: 0.28 });
  [
    [22, 423, -10, 0.72],
    [56, 418, -10, 0.68],
    [92, 413, -9, 0.64],
    [128, 407, -8, 0.6],
    [166, 401, -7, 0.56],
    [206, 397, -5, 0.52],
    [28, 456, -11, 0.68],
    [68, 449, -10, 0.62],
    [108, 442, -8, 0.58],
    [148, 436, -7, 0.54],
  ].forEach(([x, y, angle, scale]) => {
    addScreenRect(world, { x: x - 2 * scale, y: y - 13 * scale, width: 4 * scale, height: 16 * scale }, 48, screenMaterial('#f7fbff', { opacity: 0.9 }), {
      angleDegrees: angle,
    });
    addScreenRect(world, { x: x - 5 * scale, y: y - 15 * scale, width: 10 * scale, height: 3 * scale }, 49, screenMaterial('#ef9d5c', { opacity: 0.82 }), {
      angleDegrees: angle,
    });
  });
  [
    [[0, 468], [132, 445], [202, 522]],
    [[0, 499], [172, 466], [226, 522]],
    [[16, 482], [118, 466], [170, 522]],
    [[0, 448], [86, 434], [142, 507]],
  ].forEach((points) => addMeasuredRoadLine(world, points, 2.2, 48, '#78e8ff', { divisions: 30, opacity: 0.5 }));

  addScreenRect(world, { x: 0, y: 0, width: PLAZA_SCREEN.width, height: PLAZA_SCREEN.height }, 33, textureMaterial(createRoadLayerTexture(), { opacity: 0.93 }));
  addScreenRect(world, { x: 0, y: 0, width: PLAZA_SCREEN.width, height: PLAZA_SCREEN.height }, 44, textureMaterial(createPlazaDetailLayerTexture(), { opacity: 0.74 }));
  addMeasuredForegroundDensity(world);
  plazaReferenceSpec.crosswalks.forEach((crosswalk) => addMeasuredCrosswalk(world, crosswalk));
  addMeasuredRoadDetails(world);
  addMeasuredSidewalkIslands(world);
  addMeasuredBridgeForegroundDetails(world);
  addMeasuredBridgeReferencePolish(world);
  addScreenRect(world, { x: 0, y: 0, width: PLAZA_SCREEN.width, height: PLAZA_SCREEN.height }, 45.6, textureMaterial(createForegroundDepthLayerTexture(), { opacity: 0.34 }));
  addTracedPlazaShapeLayer(world, 'foregroundRoadBridge');
  addMeasuredForegroundSurfaceCorrection(world);
  addTracedPlazaShapeLayer(world, 'referenceForegroundFacets', { opacityScale: 1.75 });
  addTracedPlazaFineFacetLayer(world, 'referenceForegroundFineFacets', {
    opacity: 1,
    opacityScale: 8,
    renderOrder: 127,
    z: 64.66,
  });
  addScreenRect(world, { x: 0, y: 0, width: PLAZA_SCREEN.width, height: PLAZA_SCREEN.height }, 64.5, textureMaterial(createForegroundReferenceAtlasTexture(), { opacity: 0.3 }));
  addMeasuredPortalGlowSpills(world);
  addMeasuredPlazaProps(world);
  DISTRICT_ORDER.forEach((key) => addMeasuredDistrictShadow(world, key));
  addMeasuredRoundabout(world, landmarks);
  addMeasuredRoundaboutCrispOverlay(world);
  DISTRICT_ORDER.forEach((key) => addMeasuredDistrict(world, landmarks, key));
  DISTRICT_ORDER.forEach((key) => addMeasuredDistrictModelOverlay(world, key));
  addTracedPlazaShapeLayer(world, 'districtFacadeFacets', { opacityScale: 0.54 });
  addTracedPlazaShapeLayer(world, 'districtTraceDetails', { opacityScale: 0.42 });
  addMeasuredDistrictSilhouetteTraceOverlay(world);
  addMeasuredDistrictCrispEdges(world);
  // The measured facade stack carries the panel match; the semi-transparent model overlay softened the silhouettes.
  addMeasuredDistrictBodyReinforcement(world);
  addTracedPlazaShapeLayer(world, 'referenceDistrictFacets', { opacityScale: 2.0 });
  addTracedPlazaFineFacetLayer(world, 'referenceDistrictFineFacets', {
    opacity: 1,
    opacityScale: 8,
    renderOrder: 116.3,
    z: 112.86,
  });
  addMeasuredGeneratedFacadeHeroPass(world);
  addMeasuredDistrictFinalLinework(world);
  addMeasuredDistrictBalancedEdgePolish(world);
  addMeasuredDistrictReadableLabelPass(world);
  addMeasuredDistrictHardEdgeTopPass(world);
  addMeasuredDistrictObjectAtlas(world);
  addMeasuredPortalFinalRims(world);
  addMeasuredBeacon(world, landmarks);

  [
    [72, 350, 0.82],
    [202, 338, 0.52],
    [485, 368, 0.5],
    [561, 448, 0.55],
    [742, 322, 0.48],
    [862, 350, 0.62],
    [1008, 340, 0.88],
    [524, 465, 0.5],
    [412, 433, 0.42],
    [188, 397, 0.42],
    [318, 372, 0.34],
    [382, 386, 0.32],
    [468, 396, 0.3],
    [626, 354, 0.32],
    [684, 383, 0.34],
    [792, 352, 0.34],
    [912, 336, 0.38],
    [984, 383, 0.44],
    [266, 356, 0.34],
    [1024, 413, 0.36],
  ].forEach(([x, y, scale]) => addMeasuredTree(world, x, y, scale));

  addScreenRect(world, { x: 0, y: 0, width: PLAZA_SCREEN.width, height: PLAZA_SCREEN.height }, 95, textureMaterial(createLightingOverlayTexture(), { opacity: 1 }));
  addScreenRect(world, { x: 0, y: 0, width: PLAZA_SCREEN.width, height: PLAZA_SCREEN.height }, 96, textureMaterial(createPlazaDetailLayerTexture(), { opacity: 0.06 }));
  addScreenRect(world, { x: 0, y: 0, width: PLAZA_SCREEN.width, height: PLAZA_SCREEN.height }, 97, textureMaterial(createPlazaInkLayerTexture(), { opacity: 0.14 }));
  addMeasuredLowerLeftBridgeTonalMass(world);
  addMeasuredRightForegroundWarmRoadMass(world);
  addMeasuredForegroundFinalLinework(world);
  addMeasuredRoadTonePatches(world);
  addMeasuredRoadLightBalance(world);
  addMeasuredBridgeWaterColorBalance(world);
  addMeasuredBridgeLaneArrow(world);
  addMeasuredForegroundCrispTopPass(world);
  addMeasuredRoundaboutTopDetailPass(world);

  return world;
};

const addPlazaScene = (scene, animationHooks) => {
  return addMeasuredPlazaScene(scene, animationHooks);
  scene.background = createSkyTexture();
  scene.fog = new THREE.Fog('#d5f9ff', 250, 700);
  addLights(scene);

  const landmarks = {};
  const world = new THREE.Group();
  world.userData.landmarks = landmarks;
  scene.add(world);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 440, 16, 16),
    createBasicMaterial('#75bf58', { roughness: 0.9 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 6);
  ground.receiveShadow = true;
  world.add(ground);

  addMountainsAndClouds(world, landmarks);
  addSkyline(world, landmarks);

  const asphalt = createBasicMaterial('#303944', { roughness: 0.82 });
  const shoulder = createBasicMaterial('#d7d4c8', { roughness: 0.78 });
  const line = createBasicMaterial(CITY3D_PALETTE.roadLine, {
    emissive: CITY3D_PALETTE.roadLine,
    emissiveIntensity: 0.18,
  });
  const roadMaterials = { asphalt, line, shoulder };

  const cityDeck = new THREE.Mesh(
    new THREE.PlaneGeometry(430, 210, 1, 1),
    createBasicMaterial('#303944', { roughness: 0.84 })
  );
  cityDeck.rotation.x = -Math.PI / 2;
  cityDeck.position.set(0, 0.01, 38);
  cityDeck.receiveShadow = true;
  world.add(cityDeck);
  [
    [-122, 27, 54, 42, 0.16],
    [-56, -6, 52, 35, 0.08],
    [-2, -20, 48, 34, 0],
    [64, -8, 52, 36, -0.08],
    [128, 21, 58, 42, -0.16],
    [-8, 72, 82, 34, 0],
  ].forEach(([x, z, w, d, yaw]) => {
    addBox(
      world,
      { x: w, y: 0.1, z: d },
      { x, y: 0.18, z, ry: yaw },
      createBasicMaterial('#d7d4c8', { roughness: 0.78 }),
      { castShadow: false }
    );
  });

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(178, 104, 8, 8),
    new THREE.MeshBasicMaterial({ color: '#0b9eca', opacity: 0.78, side: THREE.DoubleSide, transparent: true })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(-150, 0.3, 118);
  water.rotation.z = -0.1;
  world.add(water);
  for (let i = 0; i < 10; i += 1) {
    addBox(
      world,
      { x: 14 + (i % 3) * 7, y: 0.05, z: 0.36 },
      { x: -196 + i * 16, y: 0.34, z: 104 + (i % 4) * 10, ry: -0.12 },
      createBasicMaterial(CITY3D_PALETTE.cyan, {
        emissive: CITY3D_PALETTE.cyan,
        emissiveIntensity: 0.28,
      }),
      { castShadow: false }
    );
  }
  const bridgeDeck = addBox(world, { x: 132, y: 1.2, z: 14 }, { x: -56, y: 2.35, z: 96, ry: -0.24 }, createBasicMaterial('#65717f'));
  landmarks.waterBridge = bridgeDeck;
  [-1, 1].forEach((side) => {
    addBox(world, { x: 132, y: 0.55, z: 0.45 }, { x: -56, y: 3.85, z: 96 + side * 7, ry: -0.24 }, createBasicMaterial('#f7fbff'));
  });

  addRoadRibbon(world, [[12, -142], [15, -86], [18, -18], [18, 42], [18, 116]], 30, 0.2, roadMaterials, {
    divisions: 72,
    telemetryId: 'backbone',
  });
  addRoadRibbon(world, [[-190, 74], [-126, 58], [-66, 40], [18, 42], [96, 46], [180, 70]], 34, 0.23, roadMaterials, {
    divisions: 96,
    lineLength: 7.5,
    telemetryId: 'midArc',
  });
  addRoadRibbon(world, [[-220, 126], [-142, 102], [-62, 84], [18, 58], [98, 84], [220, 126]], 42, 0.25, roadMaterials, {
    divisions: 110,
    lineLength: 8.5,
    telemetryId: 'foregroundArc',
  });
  addRoadRibbon(world, [[-76, 154], [-36, 104], [18, 55], [76, 104], [136, 154]], 32, 0.26, roadMaterials, {
    divisions: 76,
    centerLine: false,
    telemetryId: 'bridgeApproach',
  });
  addMidgroundBlocks(world);
  addRoadRibbon(world, [[-126, 68], [-92, 38], [-60, 12], [-30, -8]], 25, 0.24, roadMaterials, {
    divisions: 42,
    telemetryId: 'leftFeeder',
  });
  addRoadRibbon(world, [[162, 70], [118, 38], [82, 12], [54, -8]], 25, 0.24, roadMaterials, {
    divisions: 42,
    telemetryId: 'rightFeeder',
  });
  addRoadRibbon(world, [[-48, 124], [-8, 88], [18, 42], [54, 86], [104, 126]], 22, 0.21, roadMaterials, {
    centerLine: false,
    divisions: 60,
  });
  addCrosswalk(world, -102, 63, 43, -0.22);
  addCrosswalk(world, 112, 64, 43, 0.2);
  addCrosswalk(world, 18, 5, 39, 0);

  const roundabout = new THREE.Group();
  roundabout.position.set(18, 0.44, 42);
  const cyan = createBasicMaterial(CITY3D_PALETTE.cyan, {
    emissive: CITY3D_PALETTE.cyan,
    emissiveIntensity: 0.6,
  });
  const outerCurb = new THREE.Mesh(new THREE.CylinderGeometry(38, 40, 0.2, 64), shoulder);
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(32, 34, 0.24, 64), asphalt);
  outer.position.y = 0.14;
  const island = new THREE.Mesh(new THREE.CylinderGeometry(14, 16, 0.36, 48), createBasicMaterial('#d7d4c8'));
  island.position.y = 0.2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(17, 0.34, 6, 42), cyan);
  ring.position.y = 0.45;
  ring.rotation.x = Math.PI / 2;
  const laneRing = new THREE.Mesh(new THREE.TorusGeometry(27, 0.28, 5, 54), line);
  laneRing.position.y = 0.5;
  laneRing.rotation.x = Math.PI / 2;
  roundabout.add(outerCurb, outer, island, ring, laneRing);
  world.add(roundabout);
  landmarks.roundabout = roundabout;

  const districtPlacements = {
    gym: { x: -74, z: 29, scale: 0.78, yaw: 0.18 },
    food: { x: -48, z: -4, scale: 0.9, yaw: 0.08 },
    lab: { x: -12, z: -24, scale: 0.92, yaw: 0 },
    clinic: { x: 34, z: -6, scale: 0.92, yaw: -0.08 },
    garage: { x: 96, z: 18, scale: 0.82, yaw: -0.16 },
  };
  DISTRICT_ORDER.forEach((key, index) => {
    const district = createDistrictModel3D({ key, ...DISTRICT_3D_DATA[key] }, {
      phase: index * 0.72,
      scale: districtPlacements[key].scale,
    });
    district.position.set(districtPlacements[key].x, 0, districtPlacements[key].z);
    district.rotation.y = districtPlacements[key].yaw;
    world.add(district);
    landmarks[key] = district;
    animationHooks.push(district);
  });

  const beacon = createObjectiveBeacon3D({ scale: 0.92 });
  beacon.position.set(18, 0.5, 42);
  world.add(beacon);
  landmarks.beacon = beacon;
  animationHooks.push(beacon);

  const treePositions = [
    [-196, 56, 1.08],
    [-164, 12, 0.78],
    [-122, 82, 0.9],
    [-78, 82, 0.72],
    [-38, 78, 0.72],
    [56, 82, 0.78],
    [98, 86, 0.74],
    [138, 78, 0.95],
    [190, 56, 1.08],
    [-216, 148, 0.9],
    [214, 142, 0.88],
    [2, 86, 0.68],
  ];
  treePositions.forEach(([x, z, scale]) => {
    const tree = createLowPolyTree(scale);
    tree.position.set(x, 0, z);
    world.add(tree);
  });

  return world;
};

const addDistrictPreviewScene = (scene, animationHooks, districtKey) => {
  scene.background = new THREE.Color('#78d9ff');
  addLights(scene);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 80, 4, 4), createBasicMaterial('#6fc663'));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  addRoad(scene, 0, 18, 30, 46, 0);
  const district = createDistrictModel3D({ key: districtKey, ...DISTRICT_3D_DATA[districtKey] }, { scale: 1.16 });
  district.position.set(0, 0, -5);
  scene.add(district);
  animationHooks.push(district);
  [-27, 28].forEach((x) => {
    const tree = createLowPolyTree(0.8);
    tree.position.set(x, 0, 20);
    scene.add(tree);
  });
};

const addKartScene = (scene, animationHooks, view) => {
  scene.background = new THREE.Color('#6d7580');
  addLights(scene);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 54, 4, 4),
    createBasicMaterial('#5b626b', { roughness: 0.82 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const kart = createKartModelV2({ scale: view === 'hero' ? 1.95 : 1.28 });
  kart.group.position.y = view === 'hero' ? 0.4 : 0.2;
  kart.group.rotation.y =
    view === 'side' ? Math.PI / 2 : view === 'back' ? Math.PI : view === 'top' ? 0 : view === 'front' ? 0 : 0.36;
  scene.add(kart.group);
  animationHooks.push({
    userData: {
      animate: (_time, dt) => {
        kart.wheels.forEach((wheel) => {
          wheel.rotation.x += dt * 2.3;
        });
      },
    },
  });
};

const projectLandmarkBox = (object, camera, rect) => {
  if (!object || !rect.width || !rect.height) return null;
  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return null;

  const corners = [
    [box.min.x, box.min.y, box.min.z],
    [box.min.x, box.min.y, box.max.z],
    [box.min.x, box.max.y, box.min.z],
    [box.min.x, box.max.y, box.max.z],
    [box.max.x, box.min.y, box.min.z],
    [box.max.x, box.min.y, box.max.z],
    [box.max.x, box.max.y, box.min.z],
    [box.max.x, box.max.y, box.max.z],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z).project(camera));

  const xs = corners.map((point) => ((point.x + 1) / 2) * rect.width);
  const ys = corners.map((point) => ((1 - point.y) / 2) * rect.height);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  return {
    bottom: Number((bottom / rect.height).toFixed(4)),
    centerX: Number(((left + right) / 2 / rect.width).toFixed(4)),
    centerY: Number(((top + bottom) / 2 / rect.height).toFixed(4)),
    height: Number(((bottom - top) / rect.height).toFixed(4)),
    left: Number((left / rect.width).toFixed(4)),
    right: Number((right / rect.width).toFixed(4)),
    top: Number((top / rect.height).toFixed(4)),
    width: Number(((right - left) / rect.width).toFixed(4)),
  };
};

const projectScenePoint = (point, camera, rect) => {
  const projected = new THREE.Vector3(point.x, point.y || 0, point.z).project(camera);
  return {
    x: Number(((projected.x + 1) / 2).toFixed(4)),
    y: Number(((1 - projected.y) / 2).toFixed(4)),
  };
};

const publishPlazaTelemetry = (world, camera, canvas) => {
  if (!world?.userData?.landmarks || typeof window === 'undefined') return;
  const rect = canvas.getBoundingClientRect();
  const landmarks = Object.fromEntries(
    Object.entries(world.userData.landmarks)
      .map(([key, object]) => [key, projectLandmarkBox(object, camera, rect)])
      .filter(([, box]) => box)
  );
  window.__plazaVisualTelemetry = {
    aspect: Number((rect.width / Math.max(1, rect.height)).toFixed(4)),
    landmarks,
    roadCurves: Object.fromEntries(
      Object.entries(world.userData.roadCurves || {}).map(([key, curve]) => [
        key,
        {
          points: curve.points.map((point) => projectScenePoint(point, camera, rect)),
          width: curve.width,
        },
      ])
    ),
    route: window.location.hash || '#visual-plaza',
    timestamp: Date.now(),
  };
};

const cameraFor = (kind, view, aspect) => {
  if (kind === 'plaza') {
    const camera = new THREE.OrthographicCamera(-PLAZA_HALF_W, PLAZA_HALF_W, PLAZA_HALF_H, -PLAZA_HALF_H, 0.1, 2000);
    camera.position.set(0, 0, 1000);
    camera.lookAt(0, 0, 0);
    camera.userData.fixedAspect = 16 / 9;
    camera.updateProjectionMatrix();
    return camera;
  }

  const camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 900);
  if (kind === 'district') {
    camera.position.set(0, 25, 56);
    camera.lookAt(0, 14, -4);
  } else if (view === 'top') {
    camera.position.set(0, 38, 0);
    camera.lookAt(0, 0, 0);
  } else if (view === 'side') {
    camera.position.set(24, 9, 0);
    camera.lookAt(0, 2.2, 0);
  } else if (view === 'back') {
    camera.position.set(0, 9, -24);
    camera.lookAt(0, 2.3, 0);
  } else if (view === 'front') {
    camera.position.set(0, 9, 24);
    camera.lookAt(0, 2.3, 0);
  } else {
    camera.position.set(22, 15, 31);
    camera.lookAt(0, 3, 0);
  }
  camera.updateProjectionMatrix();
  return camera;
};

export const ThreeSceneCanvas = ({
  className = '',
  districtKey = 'gym',
  kind = 'plaza',
  view = 'hero',
  visualCanvas,
}) => {
  const canvasRef = useRef(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    setWebglUnavailable(false);

    const probe = document.createElement('canvas');
    const supported = Boolean(
      probe.getContext('webgl2') ||
        probe.getContext('webgl') ||
        probe.getContext('experimental-webgl')
    );
    if (!supported) {
      setWebglUnavailable(true);
      return undefined;
    }

    const scene = new THREE.Scene();
    const animationHooks = [];
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
    } catch {
      setWebglUnavailable(true);
      return undefined;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = kind === 'plaza' ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = kind === 'plaza' ? 1.0 : 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const sceneRoot =
      kind === 'plaza'
        ? addPlazaScene(scene, animationHooks)
        : kind === 'district'
        ? addDistrictPreviewScene(scene, animationHooks, districtKey)
        : addKartScene(scene, animationHooks, view);

    let camera = cameraFor(kind, view, 1);
    let raf = 0;
    let last = performance.now();

    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor((rect.width || 1) * dpr));
      const height = Math.max(1, Math.floor((rect.height || 1) * dpr));
      renderer.setPixelRatio(dpr);
      if (canvas.width !== width || canvas.height !== height) {
        renderer.setSize(rect.width || 1, rect.height || 1, false);
      }
      camera.aspect = camera.userData.fixedAspect || Math.max(0.1, (rect.width || 1) / Math.max(1, rect.height || 1));
      camera.updateProjectionMatrix();
    };

    const tick = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      fit();
      animationHooks.forEach((hook) => hook.userData?.animate?.(now, dt));
      renderer.render(scene, camera);
      if (kind === 'plaza') publishPlazaTelemetry(sceneRoot, camera, canvas);
      raf = requestAnimationFrame(tick);
    };

    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      if (kind === 'plaza' && window.__plazaVisualTelemetry?.route) window.__plazaVisualTelemetry = null;
      renderer.dispose();
    };
  }, [districtKey, kind, view]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`three-scene-canvas ${className}`}
        data-visual-canvas={visualCanvas || kind}
        data-webgl-fallback={webglUnavailable ? 'true' : 'false'}
        style={webglUnavailable ? { visibility: 'hidden' } : undefined}
      />
      {webglUnavailable && (
        <span
          aria-hidden="true"
          className={`three-scene-canvas ${className}`}
          data-testid={`visual-webgl-fallback-${visualCanvas || kind}`}
          style={{
            background:
              'linear-gradient(135deg, rgba(255, 211, 79, 0.16), rgba(70, 217, 239, 0.14)), #10151d',
          }}
        />
      )}
    </>
  );
};

export const ComebackCityScene3D = ({ className = '' }) => (
  <ThreeSceneCanvas className={className} kind="plaza" visualCanvas="plaza" />
);

export const DistrictPreview3D = ({ districtKey }) => (
  <ThreeSceneCanvas kind="district" districtKey={districtKey} visualCanvas={`district-${districtKey}`} />
);

export const KartPreview3D = ({ view = 'hero' }) => (
  <ThreeSceneCanvas kind="kart" view={view} visualCanvas={`kart-${view}`} />
);
