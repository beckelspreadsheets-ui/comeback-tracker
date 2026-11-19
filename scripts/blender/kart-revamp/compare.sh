#!/bin/sh
# Proof strips: Hero Kart, current Hash Runner, Hash Runner v2, same studio.
cd "$(dirname "$0")"
ROOT=../../..
[ -f renders/ref/hash-runner-current-decoded.glb ] || node decode-glb.mjs $ROOT/src/assets/game/models/karts/hash-runner.glb renders/ref/hash-runner-current-decoded.glb
/opt/homebrew/bin/blender -b -P render_compare.py -- renders/compare \
  "Hero Kart=$ROOT/src/assets/game/models/tripo/hero-kart-tripo.glb:+x" \
  "Hash Runner (current)=renders/ref/hash-runner-current-decoded.glb:-x:$ROOT/src/assets/game/models/karts/hash-runner.glb" \
  "Hash Runner v2=out/_bake/hash-runner-v2.raw.glb:-x:out/hash-runner-v2.glb" 2>&1 | grep -i "error\|Traceback\|^KART\|line "
