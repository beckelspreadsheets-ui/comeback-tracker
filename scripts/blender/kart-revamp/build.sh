#!/bin/sh
# Build one kart end to end: Blender script -> raw GLB -> packed game GLB.
#   scripts/blender/kart-revamp/build.sh hashrunner hash-runner-v2
set -e
cd "$(dirname "$0")"
NAME=${1:-hashrunner}; FILE=${2:-hash-runner-v2}
/opt/homebrew/bin/blender -b -P build_$NAME.py -- out/$FILE.glb 2>&1 | grep -i "error\|Traceback\|TRIS\|line \|GLB" || true
node pack-glb.mjs out/_bake/$FILE.raw.glb out/$FILE.glb
node glb-info.mjs out/$FILE.glb
