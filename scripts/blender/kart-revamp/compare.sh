#!/bin/sh
# Proof strips: Hero Kart, current Hash Runner, Hash Runner v2, same studio.
# Blender cannot open meshopt-compressed files, so the two compressed karts
# are rendered from decoded copies of the very files the game loads; the size
# on each label is the shipped file's.
#   scripts/blender/kart-revamp/compare.sh
set -e
cd "$(dirname "$0")"
ROOT=../../..
mkdir -p renders/ref
node decode-glb.mjs $ROOT/src/assets/game/models/karts/hash-runner.glb renders/ref/hash-runner-current-decoded.glb
node decode-glb.mjs out/hash-runner-v2.glb renders/ref/hash-runner-v2-decoded.glb
/opt/homebrew/bin/blender -b -P render_compare.py -- renders/compare \
  "Hero Kart=$ROOT/src/assets/game/models/tripo/hero-kart-tripo.glb:+x" \
  "Hash Runner (current)=renders/ref/hash-runner-current-decoded.glb:-x:$ROOT/src/assets/game/models/karts/hash-runner.glb" \
  "Hash Runner v2=renders/ref/hash-runner-v2-decoded.glb:-x:out/hash-runner-v2.glb" 2>&1 | grep -i "error\|Traceback\|^KART\|line "
