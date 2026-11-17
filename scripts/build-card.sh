#!/usr/bin/env bash
# Production build of the card with all five effects, each from its committed dist/ in this repo.
# v1 = peel (first run), v2 = peel (second run), v3 = window, v4 = spill, v5 = blackhole; pick one with ?fx=v1…v5.
# FX_DEFAULT chooses the build a link without ?fx= gets (default v5).
# LAYERCARD_CONTENT points at a card content folder (layers.json, layers/, profile.json, contact.vcf);
# without it the fictional example in examples/jane-maker is used.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
FX="$ROOT/packages/scene/effects"
cd "$ROOT/apps/card"
LAYERCARD_EFFECT_ENTRY="$FX/peel-v1/dist/peel.js" \
LAYERCARD_EFFECT_V2_ENTRY="$FX/peel-v2/dist/peel.js" \
LAYERCARD_EFFECT_V3_ENTRY="$FX/window/dist/window.js" \
LAYERCARD_EFFECT_V4_ENTRY="$FX/spill/dist/spill.js" \
LAYERCARD_EFFECT_V5_ENTRY="$FX/blackhole/dist/blackhole.js" \
VITE_FX_DEFAULT=${FX_DEFAULT:-v5} \
  npm run build
