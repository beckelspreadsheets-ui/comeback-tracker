#!/bin/bash
# B4 'before' evidence chain — run from repo root. Idempotent: skips steps
# whose outputs already exist, so it can be resumed if interrupted.
# HARD RULE: everything here is serial — never two vite-spawning captures at once.
set -uo pipefail
cd "$(dirname "$0")/../../.."
EV=.agent/runs/m2-b4-post-chain/evidence/before
mkdir -p "$EV"
log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$EV/progress.log"; }

if [ ! -f "$EV/build.log" ]; then
  log "STEP build: npm run build"
  npm run build > "$EV/build.log" 2>&1 || { log "BUILD FAILED"; exit 1; }
  log "build done"
else log "skip build (exists)"; fi

if [ ! -f "$EV/main-chunk-gzip.txt" ]; then
  MAIN=$(ls -S dist/assets/*.js | head -1)
  BYTES=$(gzip -c "$MAIN" | wc -c | tr -d ' ')
  echo "$MAIN $BYTES" > "$EV/main-chunk-gzip.txt"
  log "gzip main chunk: $MAIN = $BYTES bytes"
else log "skip gzip (exists)"; fi

if [ ! -f "$EV/race-proof-capture.log" ]; then
  log "STEP race:proof:capture"
  npm run race:proof:capture > "$EV/race-proof-capture.log" 2>&1 || { log "PROOF CAPTURE FAILED"; exit 1; }
  npm run race:proof:compare > "$EV/race-proof-compare.log" 2>&1 || { log "PROOF COMPARE FAILED"; exit 1; }
  log "race:proof capture+compare done"
else log "skip race:proof (exists)"; fi

for track in comeback-city penguin-village; do
  for i in 1 2 3; do
    OUT="$EV/phase5-$track-$i.log"
    if [ ! -f "$OUT" ]; then
      log "STEP phase5 $track run $i (headed)"
      PHASE5_HEADED=1 PHASE5_TRACK=$track node scripts/phase5-sustained-capture.mjs > "$OUT" 2>&1 \
        || { log "PHASE5 $track run $i FAILED"; exit 1; }
      log "phase5 $track run $i done"
    else log "skip phase5 $track $i (exists)"; fi
  done
done
log "ALL BEFORE-EVIDENCE STEPS COMPLETE"
