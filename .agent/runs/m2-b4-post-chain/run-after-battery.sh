#!/bin/bash
# B4 'after' verification battery — serial, idempotent (skips existing outputs).
# Run from anywhere; cds to repo root. Never two vite-spawning suites at once.
set -uo pipefail
cd "$(dirname "$0")/../../.."
EV=.agent/runs/m2-b4-post-chain/evidence/after
mkdir -p "$EV"
log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$EV/progress.log"; }

if [ ! -f "$EV/test-kart-playable.log" ]; then
  log "STEP test:kart-playable"
  npm run test:kart-playable > "$EV/test-kart-playable.log" 2>&1 || { log "KART-PLAYABLE FAILED"; exit 1; }
  log "test:kart-playable green"
else log "skip kart-playable"; fi

if [ ! -f "$EV/test-race.log" ]; then
  log "STEP test:race"
  npm run test:race > "$EV/test-race.log" 2>&1 || { log "TEST:RACE FAILED"; exit 1; }
  log "test:race green"
else log "skip test:race"; fi

if [ ! -f "$EV/test-track-visuals.log" ]; then
  log "STEP test:track-visuals"
  npm run test:track-visuals > "$EV/test-track-visuals.log" 2>&1 || { log "TRACK-VISUALS FAILED"; exit 1; }
  log "test:track-visuals green"
else log "skip track-visuals"; fi

if [ ! -f "$EV/race-proof-compare.log" ]; then
  log "STEP race:proof capture+compare (default path, post OFF)"
  npm run race:proof:capture > "$EV/race-proof-capture.log" 2>&1 || { log "PROOF CAPTURE FAILED"; exit 1; }
  npm run race:proof:compare > "$EV/race-proof-compare.log" 2>&1 || { log "PROOF COMPARE FAILED"; exit 1; }
  log "race:proof pass"
else log "skip race:proof"; fi

for track in comeback-city penguin-village; do
  for i in 1 2 3; do
    OUT="$EV/phase5-post-$track-$i.log"
    if [ ! -f "$OUT" ]; then
      log "STEP phase5 ?post=1 $track run $i (headed)"
      PHASE5_HEADED=1 PHASE5_TRACK=$track PHASE5_URL_EXTRA=post=1 node scripts/phase5-sustained-capture.mjs > "$OUT" 2>&1 \
        || { log "PHASE5 POST $track $i FAILED"; exit 1; }
      log "phase5 post $track $i done"
    else log "skip phase5 post $track $i"; fi
  done
done

if [ ! -f "$EV/test-race-browser.log" ]; then
  log "STEP test:race:browser (extended timeout; known-red blocker #10 expected)"
  RACE_VISUAL_READY_TIMEOUT_MS=75000 npm run test:race:browser > "$EV/test-race-browser.log" 2>&1
  echo "exit=$?" >> "$EV/test-race-browser.log"
  log "test:race:browser finished (check log — #10 no-minimap is the only acceptable red)"
else log "skip race:browser"; fi

log "ALL AFTER-BATTERY STEPS COMPLETE"
