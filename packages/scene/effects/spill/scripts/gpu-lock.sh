#!/bin/sh
# Runs a GPU-heavy command (the perf check, video renders) under the lock this Mac's runs share:
#   sh scripts/gpu-lock.sh npm run check -- perf
# The lock is a directory (mkdir is atomic). If another run holds it, wait up to 10 minutes, then go on
# anyway and say so (the brief's rule). Prints whether a process was listening on port 5275 (the
# neighbouring run's demo) while the command ran; perf evidence quotes that line.
LOCK="${SPILL_GPU_LOCK:-$HOME/dev/prv/products/layercard-runs/locks/gpu.lock}"
mkdir -p "$(dirname "$LOCK")"
waited=0
mine=0
while ! mkdir "$LOCK" 2>/dev/null; do
  if [ "$waited" -ge 600 ]; then
    echo "gpu-lock: still held after 600 s — going on without it" >&2
    break
  fi
  sleep 5
  waited=$((waited + 5))
done
[ -d "$LOCK" ] && [ "$waited" -lt 600 ] && mine=1
[ "$mine" = 1 ] && echo "spill-v4 $$ $(date '+%Y-%m-%dT%H:%M:%S')" > "$LOCK/owner"
if lsof -nP -iTCP:5275 -sTCP:LISTEN >/dev/null 2>&1; then n5275=yes; else n5275=no; fi
echo "gpu-lock: waited ${waited}s, lock held: $([ "$mine" = 1 ] && echo yes || echo no), port 5275 listening: $n5275" >&2
export SPILL_GPU_LOCK_NOTE="waited ${waited}s; lock held: $([ "$mine" = 1 ] && echo yes || echo no); port 5275 listening: $n5275"
"$@"
status=$?
if [ "$mine" = 1 ]; then rm -f "$LOCK/owner"; rmdir "$LOCK" 2>/dev/null; fi
exit $status
