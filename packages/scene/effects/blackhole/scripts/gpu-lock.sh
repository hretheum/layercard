#!/bin/sh
# Runs a GPU-heavy command (the perf check, video renders) under the lock this Mac's runs share:
#   sh scripts/gpu-lock.sh npm run check -- perf
# The lock is a directory (mkdir is atomic). If another run holds it, wait up to 10 minutes, then go on
# anyway and say so (the brief's rule). Records which of the other runs' demo ports (5273-5276) were
# listening while the command ran; perf evidence quotes that line (BLACKHOLE_GPU_LOCK_NOTE).
LOCK="${BLACKHOLE_GPU_LOCK:-$HOME/dev/prv/products/layercard-runs/locks/gpu.lock}"
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
[ "$mine" = 1 ] && echo "blackhole-v5 $$ $(date '+%Y-%m-%dT%H:%M:%S')" > "$LOCK/owner"
ports=""
for p in 5273 5274 5275 5276; do
  if lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then ports="$ports $p"; fi
done
[ -z "$ports" ] && ports=" none"
held=$([ "$mine" = 1 ] && echo yes || echo no)
echo "gpu-lock: waited ${waited}s, lock held: $held, other demo ports listening:$ports" >&2
export BLACKHOLE_GPU_LOCK_NOTE="waited ${waited}s; lock held: $held; other demo ports listening:$ports"
"$@"
status=$?
if [ "$mine" = 1 ]; then rm -f "$LOCK/owner"; rmdir "$LOCK" 2>/dev/null; fi
exit $status
