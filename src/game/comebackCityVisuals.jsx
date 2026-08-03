import { useEffect, useMemo, useRef } from 'react';
import { Check, ChevronsRight, Dumbbell, Flag, Star } from 'lucide-react';
import raceBackdrop from '../assets/game/comeback-city-race-backdrop-v2.png';
import { ComebackCityScene3D } from './ComebackCityScene3D.jsx';
// Tokens + small shared components live in comebackCityVisualTokens.jsx, which
// is what production code imports. This module is the QA/reference surface and
// re-exports them below for back-compat.
//
// It no longer imports the two kart-proof PNGs (~4.5 MiB). They were only ever
// used by ArcadeKartProofScene, which was orphaned by the app split (76513be9
// deleted App.jsx's #visual-* routes) and is now gone along with
// PlayableKartProofScene and KartDesignSheet. The PNGs remain on disk as
// artifacts; nothing imports them.
import {
  ComebackCityLogo,
  CurrencyStack,
  DISTRICT_ORDER,
  DISTRICT_VISUALS,
  GAME_STATUS,
  VISUAL_PALETTE,
} from './comebackCityVisualTokens.jsx';
import './comebackCityVisuals.css';

export {
  CAMERA_PRESETS,
  ComebackCityLogo,
  CurrencyStack,
  DISTRICT_VISUALS,
  DistrictCloseupStrip,
  GAME_STATUS,
  VISUAL_PALETTE,
} from './comebackCityVisualTokens.jsx';

const SCENE_LAYOUT = {
  gym: { left: '10.7%', scale: 1.04, top: '42.6%', width: '15.5%' },
  food: { left: '29.4%', scale: 1, top: '40.2%', width: '14.3%' },
  lab: { left: '44.4%', scale: 0.94, top: '38.4%', width: '12.7%' },
  clinic: { left: '63.8%', scale: 1, top: '40.1%', width: '14.5%' },
  garage: { left: '83.8%', scale: 1.04, top: '43%', width: '15.2%' },
};

const MOBILE_CITY_LAYOUT = {
  food: { left: '23%', scale: 0.92, top: '26%', width: '35%' },
  lab: { left: '49%', scale: 0.64, top: '31%', width: '21%' },
  garage: { left: '78%', scale: 0.82, top: '31%', width: '31%' },
};

const toRgba = (hex, alpha = 1) => {
  const clean = hex.replace('#', '');
  const value = parseInt(clean, 16);
  const r = value >> 16;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const drawCloud = (ctx, x, y, scale = 1) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.beginPath();
  ctx.moveTo(-70, 18);
  ctx.lineTo(-36, -9);
  ctx.lineTo(-10, -7);
  ctx.lineTo(10, -31);
  ctx.lineTo(47, -1);
  ctx.lineTo(88, -6);
  ctx.lineTo(47, 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(219, 247, 255, 0.82)';
  ctx.fillRect(-54, 18, 100, 7);
  ctx.restore();
};

const drawSkyline = (ctx, w, h, y, intensity = 1) => {
  const buildings = [
    [0.12, 0.18, 0.028, '#6aaec2'],
    [0.16, 0.25, 0.022, '#317aa5'],
    [0.21, 0.16, 0.032, '#91c7c9'],
    [0.28, 0.31, 0.026, '#4587b1'],
    [0.34, 0.22, 0.021, '#74b8cb'],
    [0.39, 0.27, 0.028, '#496cbd'],
    [0.46, 0.2, 0.024, '#f1c96b'],
    [0.53, 0.29, 0.028, '#548db6'],
    [0.59, 0.23, 0.025, '#9266d9'],
    [0.66, 0.34, 0.026, '#4d84b8'],
    [0.73, 0.25, 0.03, '#e2c068'],
    [0.8, 0.36, 0.026, '#6d9fbf'],
    [0.86, 0.2, 0.034, '#4d89b8'],
  ];
  buildings.forEach(([x, height, width, color], index) => {
    const bx = x * w;
    const bw = width * w;
    const bh = height * h;
    ctx.fillStyle = toRgba(color, 0.74 * intensity);
    ctx.fillRect(bx, y - bh, bw, bh);
    ctx.fillStyle = 'rgba(244, 255, 230, 0.5)';
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 2; col += 1) {
        if ((row + col + index) % 2 === 0) {
          ctx.fillRect(bx + bw * (0.25 + col * 0.35), y - bh + 18 + row * 18, 3, 5);
        }
      }
    }
  });
};

const drawMountains = (ctx, w, h, horizon) => {
  ctx.fillStyle = 'rgba(92, 151, 176, 0.5)';
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(w * 0.08, horizon - h * 0.08);
  ctx.lineTo(w * 0.16, horizon);
  ctx.lineTo(w * 0.26, horizon - h * 0.18);
  ctx.lineTo(w * 0.36, horizon);
  ctx.lineTo(w * 0.48, horizon - h * 0.14);
  ctx.lineTo(w * 0.58, horizon);
  ctx.lineTo(w * 0.78, horizon - h * 0.13);
  ctx.lineTo(w, horizon);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
  ctx.beginPath();
  ctx.moveTo(w * 0.25, horizon - h * 0.15);
  ctx.lineTo(w * 0.3, horizon - h * 0.18);
  ctx.lineTo(w * 0.35, horizon - h * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.76, horizon - h * 0.11);
  ctx.lineTo(w * 0.79, horizon - h * 0.13);
  ctx.lineTo(w * 0.83, horizon - h * 0.02);
  ctx.closePath();
  ctx.fill();
};

const drawTree = (ctx, x, y, scale = 1) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#7a5528';
  ctx.fillRect(-3, 13, 6, 18);
  ctx.fillStyle = '#6b8d22';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(25, 12);
  ctx.lineTo(-25, 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#a6c73b';
  ctx.beginPath();
  ctx.moveTo(2, -26);
  ctx.lineTo(20, 7);
  ctx.lineTo(-10, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const drawRoadStripe = (ctx, x1, y1, x2, y2, width, color) => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
};

const drawPlazaCanvas = (ctx, w, h) => {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.62);
  sky.addColorStop(0, '#2f9de7');
  sky.addColorStop(0.58, '#7fe3ff');
  sky.addColorStop(1, '#c1f4ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  drawCloud(ctx, w * 0.23, h * 0.13, 0.78);
  drawCloud(ctx, w * 0.46, h * 0.17, 0.38);
  drawCloud(ctx, w * 0.83, h * 0.12, 0.62);
  drawCloud(ctx, w * 0.96, h * 0.24, 0.38);

  drawMountains(ctx, w, h, h * 0.46);
  drawSkyline(ctx, w, h, h * 0.49, 1);

  const ground = ctx.createLinearGradient(0, h * 0.42, 0, h);
  ground.addColorStop(0, '#a6d77a');
  ground.addColorStop(1, '#4da466');
  ctx.fillStyle = ground;
  ctx.fillRect(0, h * 0.46, w, h * 0.54);

  ctx.fillStyle = '#1e93c7';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.84);
  ctx.lineTo(w * 0.17, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#eaf3e6';
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.beginPath();
  ctx.moveTo(w * 0.05, h * 0.86);
  ctx.lineTo(w * 0.19, h * 0.78);
  ctx.stroke();

  const roadColor = '#2f3740';
  const curb = '#f4f0df';
  const centerX = w * 0.56;
  const centerY = h * 0.72;
  ctx.strokeStyle = curb;
  ctx.lineWidth = h * 0.075;
  ctx.beginPath();
  ctx.moveTo(-w * 0.08, h * 0.78);
  ctx.bezierCurveTo(w * 0.18, h * 0.7, w * 0.36, h * 0.69, centerX, centerY);
  ctx.bezierCurveTo(w * 0.72, h * 0.76, w * 0.86, h * 0.69, w * 1.06, h * 0.61);
  ctx.stroke();
  ctx.strokeStyle = roadColor;
  ctx.lineWidth = h * 0.061;
  ctx.stroke();

  ctx.strokeStyle = curb;
  ctx.lineWidth = h * 0.13;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.bezierCurveTo(w * 0.52, h * 0.64, w * 0.52, h * 0.56, w * 0.52, h * 0.49);
  ctx.stroke();
  ctx.strokeStyle = roadColor;
  ctx.lineWidth = h * 0.108;
  ctx.stroke();

  ctx.strokeStyle = curb;
  ctx.lineWidth = h * 0.19;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, w * 0.14, h * 0.105, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = roadColor;
  ctx.lineWidth = h * 0.148;
  ctx.stroke();

  ctx.fillStyle = '#cbd1d5';
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, w * 0.07, h * 0.052, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#58dffa';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, w * 0.056, h * 0.041, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([18, 22]);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, w * 0.17, h * 0.13, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  drawRoadStripe(ctx, w * 0.04, h * 0.76, w * 0.22, h * 0.72, 3, VISUAL_PALETTE.roadLine);
  drawRoadStripe(ctx, w * 0.78, h * 0.71, w * 0.96, h * 0.63, 3, VISUAL_PALETTE.roadLine);
  drawRoadStripe(ctx, w * 0.52, h * 0.61, w * 0.52, h * 0.51, 3, VISUAL_PALETTE.roadLine);

  for (let i = 0; i < 8; i += 1) {
    const x = w * (0.1 + i * 0.035);
    drawRoadStripe(ctx, x, h * 0.69, x + w * 0.018, h * 0.665, 4, '#f7fbff');
  }
  for (let i = 0; i < 7; i += 1) {
    const x = w * (0.68 + i * 0.025);
    drawRoadStripe(ctx, x, h * 0.65, x + w * 0.016, h * 0.63, 4, '#f7fbff');
  }

  [
    [0.08, 0.69, 0.72],
    [0.18, 0.63, 0.56],
    [0.33, 0.79, 0.58],
    [0.39, 0.67, 0.45],
    [0.7, 0.78, 0.56],
    [0.8, 0.64, 0.48],
    [0.91, 0.7, 0.64],
  ].forEach(([x, y, scale]) => drawTree(ctx, w * x, h * y, scale));
};

const drawRaceCanvas = (ctx, w, h) => {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.68);
  sky.addColorStop(0, '#2898e3');
  sky.addColorStop(0.45, '#75dcff');
  sky.addColorStop(1, '#d2f8ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  drawCloud(ctx, w * 0.28, h * 0.16, 0.42);
  drawCloud(ctx, w * 0.74, h * 0.11, 0.52);
  drawCloud(ctx, w * 0.55, h * 0.23, 0.32);
  drawMountains(ctx, w, h, h * 0.46);
  drawSkyline(ctx, w, h, h * 0.53, 0.9);

  ctx.fillStyle = '#70bd57';
  ctx.fillRect(0, h * 0.53, w, h * 0.47);
  ctx.fillStyle = '#dad6c6';
  ctx.beginPath();
  ctx.moveTo(w * 0.21, h * 0.54);
  ctx.lineTo(w * 0.36, h);
  ctx.lineTo(0, h);
  ctx.lineTo(0, h * 0.63);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.79, h * 0.54);
  ctx.lineTo(w * 0.64, h);
  ctx.lineTo(w, h);
  ctx.lineTo(w, h * 0.63);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#2f3740';
  ctx.beginPath();
  ctx.moveTo(w * 0.42, h * 0.52);
  ctx.lineTo(w * 0.58, h * 0.52);
  ctx.lineTo(w * 0.84, h);
  ctx.lineTo(w * 0.16, h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#f7fbff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.37, h * 0.55);
  ctx.lineTo(w * 0.18, h);
  ctx.moveTo(w * 0.63, h * 0.55);
  ctx.lineTo(w * 0.82, h);
  ctx.stroke();

  ctx.strokeStyle = VISUAL_PALETTE.roadLine;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.55);
  ctx.lineTo(w * 0.5, h);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(247, 251, 255, 0.82)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i += 1) {
    const y = h * (0.58 + i * 0.06);
    const spread = (y - h * 0.53) / (h * 0.47);
    ctx.beginPath();
    ctx.moveTo(w * (0.45 - spread * 0.1), y);
    ctx.lineTo(w * (0.45 - spread * 0.12), y + 16 + i * 2);
    ctx.moveTo(w * (0.55 + spread * 0.1), y);
    ctx.lineTo(w * (0.55 + spread * 0.12), y + 16 + i * 2);
    ctx.stroke();
  }

  [
    [0.12, 0.61, 0.5],
    [0.18, 0.68, 0.62],
    [0.86, 0.62, 0.45],
    [0.91, 0.72, 0.58],
  ].forEach(([x, y, scale]) => drawTree(ctx, w * x, h * y, scale));
};

const drawReferenceCanvas = (canvas, variant) => {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (variant === 'race') drawRaceCanvas(ctx, width, height);
  else drawPlazaCanvas(ctx, width, height);
};

const VisualCanvas = ({ className = '', variant = 'plaza' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let frame = 0;
    const render = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => drawReferenceCanvas(canvas, variant));
    };
    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    window.addEventListener('resize', render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', render);
    };
  }, [variant]);

  return <canvas ref={canvasRef} className={`reference-canvas ${className}`} data-visual-canvas={variant} />;
};

const ReferenceDistrictBuilding = ({
  className = '',
  districtKey,
  href,
  onEnter,
  style,
  variant = 'scene',
}) => {
  const district = DISTRICT_VISUALS[districtKey];
  const Icon = district.icon;
  const Tag = onEnter || href ? 'button' : 'div';

  return (
    <Tag
      type={Tag === 'button' ? 'button' : undefined}
      className={`ref-district ref-district--${districtKey} ref-district--${variant} ${className}`}
      onClick={onEnter}
      style={{
        '--district-accent': district.accent,
        '--district-base': district.base,
        '--district-dark': district.dark,
        ...style,
      }}
      title={district.label}
    >
      <div className="ref-district__sign">
        <Icon size={variant === 'closeup' ? 22 : 18} strokeWidth={3} />
        <span>{district.sign}</span>
      </div>
      <div className="ref-district__roof" />
      <div className="ref-district__shell">
        <span className="ref-district__tower ref-district__tower--left" />
        <span className="ref-district__tower ref-district__tower--right" />
        <span className="ref-district__floor ref-district__floor--top" />
        <span className="ref-district__floor ref-district__floor--mid" />
        <span className="ref-district__window-grid" />
        <span className="ref-district__portal">
          <Icon size={variant === 'closeup' ? 34 : 25} strokeWidth={2.8} />
        </span>
        <span className="ref-district__glow" />
      </div>
      <div className="ref-district__props">
        <span />
        <span />
        <span />
      </div>
    </Tag>
  );
};

const ObjectiveBeacon = ({ className = '', compact = false }) => (
  <div className={`objective-beacon ${compact ? 'objective-beacon--compact' : ''} ${className}`} aria-label="Objective beacon">
    <span className="objective-beacon__beam" />
    <span className="objective-beacon__halo objective-beacon__halo--outer" />
    <span className="objective-beacon__halo objective-beacon__halo--inner" />
    <span className="objective-beacon__badge">
      <Flag size={compact ? 28 : 34} fill="currentColor" strokeWidth={2.4} />
    </span>
  </div>
);

export const ReferencePlazaView = ({ activeDestinationKey, destinations = [], onEnter }) => {
  const destinationByKey = useMemo(
    () => new Map(destinations.map((destination) => [destination.key, destination])),
    [destinations]
  );

  return (
    <section className="reference-plaza" data-visual-section="desktop-plaza">
      <ComebackCityScene3D />
      <div className="reference-plaza__logo">
        <ComebackCityLogo />
      </div>
      <div className="comeback-slogan-badge reference-plaza__slogan">Train. Improve. Comeback.</div>
      <div className="reference-plaza__districts reference-plaza__districts--hit-map" aria-label="Comeback City districts">
        {DISTRICT_ORDER.map((districtKey) => {
          const destination = destinationByKey.get(districtKey);
          return (
            <button
              key={districtKey}
              type="button"
              aria-label={DISTRICT_VISUALS[districtKey].label}
              className={`reference-plaza__hit reference-plaza__hit--${districtKey} ${
                activeDestinationKey === districtKey ? 'reference-plaza__hit--active' : ''
              }`}
              onClick={destination ? () => onEnter?.(destination) : undefined}
              style={SCENE_LAYOUT[districtKey]}
            />
          );
        })}
      </div>
    </section>
  );
};

const KartCssModel = ({ mode = 'hero' }) => (
  <div className={`kart-css kart-css--${mode}`} aria-hidden="true">
    <span className="kart-css__shadow" />
    <span className="kart-css__wheel kart-css__wheel--front-left" />
    <span className="kart-css__wheel kart-css__wheel--front-right" />
    <span className="kart-css__wheel kart-css__wheel--rear-left" />
    <span className="kart-css__wheel kart-css__wheel--rear-right" />
    <span className="kart-css__axle kart-css__axle--front" />
    <span className="kart-css__axle kart-css__axle--rear" />
    <span className="kart-css__base" />
    <span className="kart-css__side kart-css__side--left" />
    <span className="kart-css__side kart-css__side--right" />
    <span className="kart-css__nose" />
    <span className="kart-css__stripe" />
    <span className="kart-css__seat" />
    <span className="kart-css__cage" />
    <span className="kart-css__headlight kart-css__headlight--left" />
    <span className="kart-css__headlight kart-css__headlight--right" />
    <span className="kart-css__boost" />
  </div>
);

export const ObjectiveCard = ({ compact = false }) => (
  <div className={`objective-card ${compact ? 'objective-card--compact' : ''}`}>
    <div className="objective-card__eyebrow">Next Objective</div>
    <div className="objective-card__body">
      <span className="objective-card__icon">
        <Dumbbell size={compact ? 20 : 26} strokeWidth={2.7} />
      </span>
      <div>
        <p>
          Reach the <strong>GYM</strong>
        </p>
        <b>{GAME_STATUS.nextDistance}</b>
      </div>
    </div>
  </div>
);

const RaceMinimap = ({ className = '' }) => (
  <div className={`race-minimap ${className}`} aria-label="Minimap">
    <span className="race-minimap__north">N</span>
    <span className="race-minimap__route" />
    <span className="race-minimap__arrow" />
  </div>
);

const GoButton = ({ className = '' }) => (
  <button type="button" className={`arcade-go-button ${className}`} aria-label="Go">
    <ChevronsRight size={43} strokeWidth={4} />
    <span>Go!</span>
  </button>
);

export const MobileRaceReference = () => (
  <section className="mobile-race-reference" data-visual-section="mobile-race">
    <img className="mobile-race-reference__backdrop" src={raceBackdrop} alt="" aria-hidden="true" />
    <ObjectiveBeacon className="mobile-race-reference__beacon" compact />
    <ObjectiveCard />
    <CurrencyStack className="mobile-race-reference__currency" />
    <RaceMinimap />
    <GoButton />
    <KartCssModel mode="race" />
  </section>
);

const DistrictButton = ({ districtKey }) => {
  const district = DISTRICT_VISUALS[districtKey];
  const Icon = district.icon;
  return (
    <button
      type="button"
      className="hud-board__district"
      style={{ '--district-accent': district.accent, '--district-dark': district.dark }}
    >
      <span>
        <Icon size={25} strokeWidth={2.8} />
      </span>
      <strong>{district.sign}</strong>
    </button>
  );
};

const DailyGoal = ({ label, progress, reward }) => (
  <div className="hud-board__goal">
    <span>{label}</span>
    <i>
      <b style={{ width: `${progress}%` }} />
    </i>
    <strong>
      <Star size={13} fill="currentColor" />
      {reward}
    </strong>
  </div>
);

export const HudMoodBoard = ({ profile }) => {
  const level = 12;
  const currentLevelXp = 2450;
  const nextLevelXp = 3500;
  const xpPct = Math.max(0, Math.min(100, (currentLevelXp / nextLevelXp) * 100));

  return (
    <section className="hud-board" data-visual-section="hud-board">
      <div className="hud-board__header">
        <div className="hud-board__level">{level}</div>
        <div className="hud-board__xp">
          <span>Trainer</span>
          <i>
            <b style={{ width: `${xpPct}%` }} />
          </i>
          <strong>
            {currentLevelXp} / {nextLevelXp} XP
          </strong>
        </div>
        <CurrencyStack className="hud-board__currency" />
      </div>
      <div className="hud-board__main">
        <RaceMinimap className="hud-board__minimap" />
        <ObjectiveCard compact />
        <div className="hud-board__districts">
          <div className="hud-board__title">Districts</div>
          <div className="hud-board__district-grid">
            {DISTRICT_ORDER.map((districtKey) => (
              <DistrictButton key={districtKey} districtKey={districtKey} />
            ))}
          </div>
        </div>
        <div className="hud-board__progress">
          <div className="hud-board__title">Progress</div>
          <span>Week 3</span>
          <div className="hud-board__nodes">
            {[0, 1, 2].map((item) => (
              <b key={item}>
                <Check size={16} strokeWidth={4} />
              </b>
            ))}
            <strong />
          </div>
        </div>
        <div className="hud-board__daily">
          <div className="hud-board__title">Daily Goals</div>
          <DailyGoal label="Complete 3 Races" progress={64} reward="50" />
          <DailyGoal label="Visit 2 Districts" progress={50} reward="40" />
          <DailyGoal label="Drift 800m" progress={42} reward="30" />
        </div>
        <GoButton className="hud-board__go" />
      </div>
    </section>
  );
};

export const VisualReferencePage = ({ children, type = 'panel' }) => (
  <main className={`visual-reference-page visual-reference-page--${type}`}>{children}</main>
);
