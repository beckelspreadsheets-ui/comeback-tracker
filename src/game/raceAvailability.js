const DISABLED_VALUES = new Set(['1', 'true', 'yes', 'on', 'disabled']);
const DEFAULT_DISABLED_REASON = 'Race mode is temporarily unavailable.';
export const RACE_DESTINATION_KEY = 'raceway';

export const getRaceAvailability = (env = import.meta.env || {}) => {
  const flagValue = String(env?.VITE_RACE_DISABLED || '').trim().toLowerCase();
  const disabled = DISABLED_VALUES.has(flagValue);
  const reason = String(env?.VITE_RACE_DISABLED_REASON || '').trim() || DEFAULT_DISABLED_REASON;

  return {
    disabled,
    reason: disabled ? reason : '',
  };
};

export const filterRaceDestinations = (destinations, availability = getRaceAvailability()) => {
  if (!availability?.disabled) return destinations;
  return destinations.filter((destination) => destination.key !== RACE_DESTINATION_KEY);
};
