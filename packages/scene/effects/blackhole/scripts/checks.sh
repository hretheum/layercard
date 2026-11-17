#!/bin/sh
# Runs the checks in one configuration and logs to artifacts/tmp/checks-<config>.log.
#   sh scripts/checks.sh webkit|chromium|metal [playwright args, e.g. frame-zero.spec.ts]
# webkit: Playwright WebKit (GPU). chromium: Playwright's headless shell (WebGL in software).
# metal: full Chromium on the real GPU (results in checks/results/chromium-metal/).
# With no spec named, everything but perf runs first and perf runs last under the shared GPU lock.
cd "$(dirname "$0")/.." || exit 1
cfg="$1"; shift
mkdir -p artifacts/tmp
log="artifacts/tmp/checks-$cfg.log"
case "$cfg" in
  webkit) proj=webkit ;;
  chromium) proj=chromium ;;
  metal) proj=chromium; export BLACKHOLE_GL=metal BLACKHOLE_CHANNEL=chromium ;;
  *) echo "usage: checks.sh webkit|chromium|metal [args]"; exit 2 ;;
esac
{
  echo "== $cfg start $(date '+%H:%M:%S')"
  if [ "$#" -gt 0 ]; then
    npx playwright test -c checks/playwright.config.ts --project=$proj "$@"
    st=$?
  else
    npx playwright test -c checks/playwright.config.ts --project=$proj --grep-invert "perf:"
    st=$?
    sh scripts/gpu-lock.sh npx playwright test -c checks/playwright.config.ts --project=$proj perf.spec.ts
    st2=$?
    [ "$st" = 0 ] && st=$st2
  fi
  echo "== $cfg end $(date '+%H:%M:%S') status $st"
} > "$log" 2>&1
tail -4 "$log"
exit $st
