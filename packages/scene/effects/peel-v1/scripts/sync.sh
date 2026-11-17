#!/bin/sh
# Sandbox helper: packs the sources of this folder for transfer into the worktree. Everything that is
# produced natively on the Mac is left out (node_modules, dist, checks/results, artifacts).
# Every pack gets a unique name: the file bridge served a stale copy when a name was reused.
cd "$(dirname "$0")/.." && mkdir -p /mnt/user-data/outputs && rm -f /mnt/user-data/outputs/peel-sync-*.tgz \
  && out=/mnt/user-data/outputs/peel-sync-$(date +%H%M%S).tgz \
  && tar --exclude=node_modules --exclude=./artifacts --exclude=./dist --exclude=./checks/results --exclude=.DS_Store -czf "$out" . \
  && echo "$out $(sha256sum "$out" | cut -c1-16)"
