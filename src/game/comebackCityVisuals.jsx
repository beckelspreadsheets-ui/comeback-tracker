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
    fov: 70,
    height: 10.6,
    label: 'mobile portrait chase',
    lookAhead: 44,
  },
};

export const DISTRICT_VISUALS = {
  gym: {
    accent: VISUAL_PALETTE.gym,
    base: '#37934a',
    dark: '#1f5f35',
    icon: Dumbbell,
    label: 'Gym',
    props: ['barbells', 'turf'],
    sign: 'GYM',
  },
  food: {
    accent: VISUAL_PALETTE.food,
    base: '#ef7f24',
    dark: '#9d4516',
    icon: Utensils,
    label: 'Food Court',
    props: ['awnings', 'tables'],
    sign: 'FOOD COURT',
  },
  lab: {
    accent: VISUAL_PALETTE.lab,
    base: '#7b45cf',
    dark: '#38206f',
    icon: FlaskConical,
    label: 'Lab',
    props: ['tubes', 'dish'],
    sign: 'LAB',
  },
  clinic: {
    accent: VISUAL_PALETTE.clinic,
    base: '#dc4048',
    dark: '#7c202c',
    icon: HeartPulse,
    label: 'Clinic',
    props: ['cross', 'lights'],
    sign: 'CLINIC',
  },
  garage: {
    accent: VISUAL_PALETTE.garage,
    base: '#236fd3',
    dark: '#143d78',
    icon: Wrench,
    label: 'Garage',
    props: ['tires', 'ramps'],
    sign: 'GARAGE',
  },
};

export const GAME_STATUS = {
  energy: '40/40',
  gems: '1250',
  nextDistance: '320m',
  nextObjective: 'Reach the Gym',
};

export const ComebackCityLogo = ({ className = '' }) => (
  <div className={`comeback-city-logo ${className}`} aria-label="Comeback City">
    <div className="comeback-city-logo__burst" />
    <div className="comeback-city-logo__text">
      <span>Comeback</span>
      <strong>City</strong>
    </div>
  </div>
);

const DistrictFacade = ({ district }) => {
  const Icon = district.icon;
  return (
    <div
      className="district-card__facade"
      style={{
        '--district-accent': district.accent,
        '--district-base': district.base,
        '--district-dark': district.dark,
      }}
    >
      <div className="district-card__roof" />
      <div className="district-card__tower district-card__tower--left" />
      <div className="district-card__tower district-card__tower--right" />
      <div className="district-card__windows" />
      <div className="district-card__portal">
        <Icon size={22} strokeWidth={2.7} />
      </div>
      <div className="district-card__props">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
};

export const DistrictCloseupStrip = ({ destinations = [], onEnter }) => {
  const districtDestinations = destinations.filter((destination) => DISTRICT_VISUALS[destination.key]);

  return (
    <div className="district-closeups" data-visual-section="district-closeups">
      <div className="district-closeups__tag">District Closeups</div>
      <div className="district-closeups__grid">
        {districtDestinations.map((destination) => {
          const district = DISTRICT_VISUALS[destination.key];
          const Icon = district.icon;
          return (
            <button
              key={destination.key}
              type="button"
              className="district-card"
              onClick={() => onEnter?.(destination)}
              style={{
                '--district-accent': district.accent,
                '--district-base': district.base,
                '--district-dark': district.dark,
              }}
              title={district.label}
            >
              <div className="district-card__banner">
                <Icon size={15} strokeWidth={3} />
                <span>{district.sign}</span>
              </div>
              <DistrictFacade district={district} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

const KartCssModel = ({ mode = 'hero' }) => (
  <div className={`kart-css kart-css--${mode}`} aria-hidden="true">
    <span className="kart-css__shadow" />
    <span className="kart-css__wheel kart-css__wheel--front-left" />
    <span className="kart-css__wheel kart-css__wheel--front-right" />
    <span className="kart-css__wheel kart-css__wheel--rear-left" />
    <span className="kart-css__wheel kart-css__wheel--rear-right" />
    <span className="kart-css__base" />
    <span className="kart-css__nose" />
    <span className="kart-css__stripe" />
    <span className="kart-css__seat" />
    <span className="kart-css__cage" />
    <span className="kart-css__headlight kart-css__headlight--left" />
    <span className="kart-css__headlight kart-css__headlight--right" />
    <span className="kart-css__boost" />
  </div>
);

const StatBar = ({ label, value }) => (
  <div className="kart-sheet__stat">
    <span>{label}</span>
    <div>
      <i style={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%` }} />
    </div>
  </div>
);

export const KartDesignSheet = ({ profile }) => {
  const stats = profile?.race?.statBars || {};
  const statValue = (value, fallback) => Math.max(fallback, Math.min(100, Number(value) || fallback));
  const swatches = [
    VISUAL_PALETTE.redKart,
    '#f4f7f8',
    '#202837',
    VISUAL_PALETTE.cyan,
    VISUAL_PALETTE.roadLine,
  ];

  return (
    <section className="kart-sheet" data-visual-section="garage-sheet">
      <div className="kart-sheet__header">
        <span>4</span>
        <strong>Kart Design Sheet</strong>
      </div>
      <div className="kart-sheet__hero">
        <KartCssModel mode="hero" />
      </div>
      <div className="kart-sheet__views">
        {['Front', 'Side', 'Back', 'Top'].map((view) => (
          <div key={view} className={`kart-sheet__view kart-sheet__view--${view.toLowerCase()}`}>
            <span>{view}</span>
            <KartCssModel mode={view.toLowerCase()} />
          </div>
        ))}
      </div>
      <div className="kart-sheet__swatches">
        {swatches.map((swatch) => (
          <span key={swatch} style={{ background: swatch }} />
        ))}
      </div>
      <div className="kart-sheet__stats">
        <StatBar label="Speed" value={statValue(stats.speed, 70)} />
        <StatBar label="Acceleration" value={statValue(stats.acceleration, 64)} />
        <StatBar label="Handling" value={statValue(stats.grip, 58)} />
        <StatBar label="Durability" value={66} />
      </div>
      <div className="kart-sheet__tagline">
        <strong>Built to train.</strong>
        <strong>Built to comeback.</strong>
        <Zap size={24} />
      </div>
    </section>
  );
};

export const CurrencyStack = ({ className = '' }) => (
  <div className={`currency-stack ${className}`}>
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
