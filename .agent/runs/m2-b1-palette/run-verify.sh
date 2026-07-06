#!/bin/bash
# B1 part-2 verification battery (V8 storm-front palette landed in
# penguinVillage.js). Serial, idempotent. Comeback City must stay
# zero-diff (it has no palette keys — fallbacks by construction).
set -uo pipefail
cd "$(dirname "$0")/../../.."
EV=.agent/runs/m2-b1-palette/evidence
mkdir -p "$EV"
log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$EV/progress.log"; }

if [ ! -f "$EV/build.log" ]; then
  log "STEP build"
  npm run build > "$EV/build.log" 2>&1 || { log "BUILD FAILED"; exit 1; }
  log "build done"
else log "skip build"; fi

if [ ! -f "$EV/test-track-visuals.log" ]; then
  log "STEP test:track-visuals"
  npm run test:track-visuals > "$EV/test-track-visuals.log" 2>&1 || { log "TRACK-VISUALS FAILED"; exit 1; }
  log "test:track-visuals green"
else log "skip track-visuals"; fi

if [ ! -f "$EV/test-kart-playable.log" ]; then
  log "STEP test:kart-playable"
  npm run test:kart-playable > "$EV/test-kart-playable.log" 2>&1 || { log "KART-PLAYABLE FAILED"; exit 1; }
  log "test:kart-playable green"
else log "skip kart-playable"; fi

if [ ! -f "$EV/race-proof-compare.log" ]; then
  log "STEP race:proof capture+compare"
  npm run race:proof:capture > "$EV/race-proof-capture.log" 2>&1 || { log "PROOF CAPTURE FAILED"; exit 1; }
  npm run race:proof:compare > "$EV/race-proof-compare.log" 2>&1 || { log "PROOF COMPARE FAILED"; exit 1; }
  log "race:proof pass"
else log "skip race:proof"; fi

for track in comeback-city penguin-village; do
  for i in 1 2 3; do
    OUT="$EV/phase5-$track-$i.log"
    if [ ! -f "$OUT" ]; then
      log "STEP phase5 $track run $i (headed, default chain)"
      PHASE5_HEADED=1 PHASE5_TRACK=$track node scripts/phase5-sustained-capture.mjs > "$OUT" 2>&1 \
        || { log "PHASE5 $track $i FAILED"; exit 1; }
      log "phase5 $track $i done"
    else log "skip phase5 $track $i"; fi
  done
done

log "ALL B1 VERIFICATION STEPS COMPLETE"
