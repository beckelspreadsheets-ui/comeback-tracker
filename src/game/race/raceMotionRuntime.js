export const reducedMotionFor = ({ mediaMatches = false, setting = false } = {}) =>
  Boolean(setting || mediaMatches);

export const createRaceMotionRuntime = ({
  canvas = null,
  reducedMotionSetting = false,
  windowRef = null,
} = {}) => {
  const mediaQuery =
    typeof windowRef?.matchMedia === 'function'
      ? windowRef.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  let reduced = reducedMotionFor({
    mediaMatches: Boolean(mediaQuery?.matches),
    setting: reducedMotionSetting,
  });

  const applyCanvasState = () => {
    if (canvas?.dataset) canvas.dataset.reducedMotion = reduced ? 'true' : 'false';
  };

  const syncReducedMotion = (event = null) => {
    reduced = reducedMotionFor({
      mediaMatches: Boolean(event?.matches ?? mediaQuery?.matches),
      setting: reducedMotionSetting,
    });
    applyCanvasState();
    return reduced;
  };

  applyCanvasState();
  if (mediaQuery?.addEventListener) mediaQuery.addEventListener('change', syncReducedMotion);
  else mediaQuery?.addListener?.(syncReducedMotion);

  const dispose = () => {
    if (mediaQuery?.removeEventListener) mediaQuery.removeEventListener('change', syncReducedMotion);
    else mediaQuery?.removeListener?.(syncReducedMotion);
  };

  return {
    dispose,
    isReduced: () => reduced,
    syncReducedMotion,
  };
};
