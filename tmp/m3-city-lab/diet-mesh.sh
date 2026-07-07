#!/bin/bash
# House mesh diet (individual verbs, per kart-art-direction rules):
# weld -> simplify -> resize. Usage: diet-mesh.sh <in.glb> <out.glb> [ratio]
set -e
IN="$1"; OUT="$2"; RATIO="${3:-0.02}"
T1="$(mktemp -u).glb"; T2="$(mktemp -u).glb"
npx @gltf-transform/cli weld "$IN" "$T1" > /dev/null
npx @gltf-transform/cli simplify "$T1" "$T2" --ratio "$RATIO" --error 0.001 > /dev/null
npx @gltf-transform/cli resize "$T2" "$OUT" --width 1024 --height 1024 > /dev/null
rm -f "$T1" "$T2"
ls -la "$OUT"
