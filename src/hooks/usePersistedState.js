import { useState, useEffect, useRef } from 'react';
import { DEFAULT_SETTINGS, DEFAULT_FOOD } from '../lib/program.js';

const STORAGE_KEY = 'comeback-tracker-v1';
const SCHEMA_VERSION = 2;

const makeDefaultState = () => ({
  schemaVersion: SCHEMA_VERSION,
  settings: DEFAULT_SETTINGS,
  oneRMs: {},
  currentWeek: 1,
  logs: {},
  metrics: [],
  epleyRows: Array.from({ length: 6 }, () => ({ name: '', wt: '', reps: '', rir: '' })),
  food: DEFAULT_FOOD,
});

// v1 → v2: add `food` branch with preset defaults. Legacy state untouched.
const migrate = (parsed) => {
  const migrated = { ...parsed };
  if (!migrated.food) {
    migrated.food = DEFAULT_FOOD;
  } else {
    migrated.food = {
      targets: { ...DEFAULT_FOOD.targets, ...(migrated.food.targets || {}) },
      library: migrated.food.library || [],
      log: migrated.food.log || {},
    };
  }
  migrated.schemaVersion = SCHEMA_VERSION;
  return migrated;
};

const loadState = () => {
  const defaults = makeDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      return { ...defaults, ...migrate(parsed) };
    }
    return { ...defaults, ...parsed };
  } catch (err) {
    console.warn('Failed to load saved state, starting fresh:', err);
    return defaults;
  }
};

export const usePersistedState = () => {
  const [state, setState] = useState(loadState);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (err) {
        console.error('Failed to persist state:', err);
      }
    }, 200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  return [state, setState];
};

export const clearAllData = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  } catch (err) {
    console.error('Failed to clear data:', err);
  }
};
