// Lightweight Comeback City visual tokens + small shared components (A4).
//
// This module exists so the STATIC importers of the city look (WorldScene,
// HudOverlay, ArcadeRace3D) never touch comebackCityVisuals.jsx, whose
// static QA proof-PNG imports (~4.5 MiB) would otherwise ship in every
// production build. comebackCityVisuals.jsx re-exports everything here for
// back-compat and is only reachable through App.jsx's dev/flag-gated lazy
// routes, so production builds drop it and its PNGs entirely.
import {
  Dumbbell,
  FlaskConical,
  Gem,
  HeartPulse,
  Settings,
  Utensils,
  Wrench,
  Zap,
} from 'lucide-react';
import { DistrictPreview3D } from './ComebackCityScene3D.jsx';
import './comebackCityVisuals.css';

export const VISUAL_PALETTE = {
  cyan: '#46d9ef',
  garage: '#2cc8ff',
  gem: '#36e6ff',
  glass: '#07182a',
  glassEdge: '#78e9ff',
  gym: '#80ff62',
  clinic: '#ff5b68',
  food: '#ffac32',
  lab: '#d45cff',
  roadLine: '#ffd34f',
  navy: '#061522',
  redKart: '#ef4334',
  tire: '#0b1019',
};

export const CAMERA_PRESETS = {
  desktopPlaza: {
    distance: 270,
    fov: 44,
    height: 124,
    label: 'desktop plaza 16:9',
    lookHeight: 24,
  },
  districtCloseup: {
    distance: 54,
    fov: 44,
    height: 24,
    label: 'district closeup',
  },
  garageKartPreview: {
    distance: 38,
    fov: 38,
    height: 16,
    label: 'garage kart preview',
  },
  mobileChase: {
    distance: 38,
    fov: 66,
    height: 9.8,
    label: 'mobile portrait chase',
    lookAhead: 52,
  },
};

export const DISTRICT_VISUALS = {
  gym: {
    accent: VISUAL_PALETTE.gym,
    base: '#37934a',
    dark: '#1f5f35',
    icon: Dumbbell,
    label: 'Gym',
    sign: 'GYM',
  },
  food: {
    accent: VISUAL_PALETTE.food,
    base: '#ef7f24',
    dark: '#9d4516',
    icon: Utensils,
    label: 'Food Court',
    sign: 'FOOD COURT',
  },
  lab: {
    accent: VISUAL_PALETTE.lab,
    base: '#7b45cf',
    dark: '#38206f',
    icon: FlaskConical,
    label: 'Lab',
    sign: 'LAB',
  },
  clinic: {
    accent: VISUAL_PALETTE.clinic,
    base: '#dc4048',
    dark: '#7c202c',
    icon: HeartPulse,
    label: 'Clinic',
    sign: 'CLINIC',
  },
  garage: {
    accent: VISUAL_PALETTE.garage,
    base: '#236fd3',
    dark: '#143d78',
    icon: Wrench,
    label: 'Garage',
    sign: 'GARAGE',
  },
};

export const GAME_STATUS = {
  energy: '40/40',
  gems: '1250',
  nextDistance: '320m',
  nextObjective: 'Reach the Gym',
};

export const DISTRICT_ORDER = ['gym', 'food', 'lab', 'clinic', 'garage'];

export const ComebackCityLogo = ({ className = '' }) => (
  <div className={`comeback-city-logo ${className}`} aria-label="Comeback City">
    <div className="comeback-city-logo__burst" />
    <div className="comeback-city-logo__text">
      <span>Comeback</span>
      <strong>City</strong>
    </div>
  </div>
);

export const CurrencyStack = ({ className = '' }) => (
  <div className={`currency-stack ${className}`} data-visual-section="currency-stack">
    <div>
      <Zap size={18} />
      <strong>{GAME_STATUS.energy}</strong>
      <span>+</span>
    </div>
    <div>
      <Gem size={17} />
      <strong>{GAME_STATUS.gems}</strong>
      <span>+</span>
    </div>
    <button type="button" aria-label="Settings">
      <Settings size={18} />
    </button>
  </div>
);

export const DistrictCloseupStrip = ({ destinations = [], onEnter }) => {
  const keys = destinations.length
    ? destinations.map((destination) => destination.key).filter((key) => DISTRICT_VISUALS[key])
    : DISTRICT_ORDER;

  return (
    <section className="district-closeups" data-visual-section="district-closeups">
      <div className="district-closeups__tag">
        <span>3</span>
        <strong>District Closeups</strong>
      </div>
      <div className="district-closeups__grid">
        {keys.map((districtKey) => {
          const destination = destinations.find((item) => item.key === districtKey);
          return (
            <button
              key={districtKey}
              type="button"
              className="district-closeups__panel"
              onClick={destination ? () => onEnter?.(destination) : undefined}
              title={DISTRICT_VISUALS[districtKey].label}
            >
              <DistrictPreview3D districtKey={districtKey} />
              <span className="district-closeups__label">
                <strong>{DISTRICT_VISUALS[districtKey].sign}</strong>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
