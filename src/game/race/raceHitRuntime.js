import {
  applyPlayerHitResponse,
  applyRivalHitResponse,
} from './physics/kartPhysics.js';

export const applyPlayerHitRuntime = ({
  playCue = () => {},
  race,
  scatterBananas = () => null,
  severity = 1,
} = {}) => {
  const hit = applyPlayerHitResponse({
    player: race?.player,
    severity,
  });
  if (!hit.applied) return hit;
  race.cameraShakeTimer = Math.max(race.cameraShakeTimer, hit.cameraShakeTimer);
  race.screenFlashTimer = Math.max(race.screenFlashTimer, hit.screenFlashTimer);
  playCue(hit.cue, 0.1);
  scatterBananas(race.player, hit.bananaScatterCount);
  return hit;
};

export const applyRivalHitRuntime = ({ rival, severity = 1 } = {}) =>
  applyRivalHitResponse({
    rival,
    severity,
  });

export const createRaceHitRuntime = ({
  playCue = () => {},
  race,
  scatterBananas = () => null,
} = {}) => ({
  hitPlayer: (severity = 1) =>
    applyPlayerHitRuntime({
      playCue,
      race,
      scatterBananas,
      severity,
    }),
  hitRival: (rival, severity = 1) =>
    applyRivalHitRuntime({
      rival,
      severity,
    }),
});
