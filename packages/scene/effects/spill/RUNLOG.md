# spill v4 — run log

Times are from `date` on the Mac (CET) or from `git log`. Numbers name their source file.
Commands ran natively on the Mac (Apple M3, macOS, Node 22.14.0) in worktree `layercard-scene-v4`,
branch `scene/spill-v4`. Dev server: port 5276. Playwright 1.65.1 (Chromium 1255, WebKit 2388).

## S1 — skeleton (2026-11-16, 00:02–00:26)

- 00:02 Start. Branch at `dc1d72a` (brief only), `spill/` holds `PROMPT.md`. No `node_modules`.
  Ports 5274 (peel) and 5275 (window run) are listening; this run uses 5276. No other process has
  its working directory in this worktree (`lsof -d cwd`).
- 00:10 peel v2 copied into `spill/` (`rsync`, without artifacts, history, process, results, dist,
  the v1-beside-v2 tools and the sandbox sync script) and renamed: package, bundle (`dist/spill.js`),
  font file and family (`spill-mono.woff2`, `SpillMono`), build constants (`__SPILL_TEST__`,
  `__SPILL_FONT_URL__`), env switches (`SPILL_GL`, `SPILL_CHANNEL`, …), shader defines, port 5276.
  The schedule constant `PEEL` (the 0.25 s lift-off) keeps its name: it names the motion, not the effect.
- 00:10 `npm install` at the worktree root: 65 packages from the npm cache in 2 s. It rewrote
  `package-lock.json` at the root (the new workspace). Build: `dist/spill.js` 69.53 kB (22.63 kB gzip).
- 00:13 `SPEC.md` written: 25 acceptance items.
- 00:18 `scripts/eval.mjs` still pointed at port 5274 (peel's server) after the rename — the file did
  not contain the word "peel", so the rename skipped it. Fixed before it was ever run.
- 00:11–00:19 All 22 copied checks except `perf`: 44 tests passed (Chromium and WebKit) in 7.1 min.
- 00:19–00:22 `perf` under the GPU lock: 2 passed in 3.5 min (Chromium software GL 2.4 min, WebKit
  1.0 min); lock waited 0 s; port 5275 was listening during the measurement.
- 00:23 Contact sheets of the renamed baseline: `process/s1-baseline-*.{png,jpg}` — the stack hovers
  above the phone. This is the picture the brief rules out; S2 replaces it.

## S2 — the room (00:25–)

- 00:27–00:44 Design fixed in `SPEC.md`, then written in one go: `src/room.ts` (room poses from the
  manifest alone), `src/schedule.ts` (one 7.5 s event, `zoomAt`, the heavy travel curve), `src/layout.ts`
  (labels on the visible outline of a sheet), `src/gl.ts` (hole behind the phone, near fade, unroll,
  soft guides, plane of columns, flat rounded rect), `src/effect.ts` rewritten (1756 lines): the host
  keeps peel's card frame (now scaled by the zoom), the guest gives every sheet its own transform in
  camera space. `demo/camera.ts`: a room at room scale (30 cm tiles, a 90 x 203 cm door, a figure).
- 00:46 First frames (`process/s2-first-look.jpg`). Everything drew at once; the wall was a dark
  pane over the whole frame and the column lines read as pinstripes.
- 00:49 After looking: print density behind the phone 0.66 -> 0.5, column lines 0.6 -> 0.34, band
  fill 0.045 -> 0.03; labels of right-hand sheets hang on the right end of their visible top edge;
  the other layers 3 card widths across (was 3.4) and 0.85 off the axis (was 1.15) so more of each
  is in the frame.
- 00:52 New checks green in Chromium at the first run: `room-scale` (16 poses) and `steady-room`.
  `steady-room.json`: sheet corners move 0.655 px per frame (p95) under jitter, 5.872 px without the
  pose filter; card-corner lag in a real move 2.283 px at most.
- 00:53–01:08 The copied checks against the new effect: 13 of 19 passed unchanged (frame-zero,
  rebuild-end, assemble-end, qr, safe-rects, determinism, dispose, flash). Adapted: `contract`
  (7.5 s event, new leave order), `assemble-overflow` (corners from the effect's own transforms;
  side edges checked in `assemble` only — in `fly` sheets arrive from a room wider than the canvas),
  `reduced`, `lift-handoff` (the zoomed-out artboard), `label-steady` (rewritten for the new labels).
  Removed: `chrome`, `leaders-grid` (peel's stack and its leader rails no longer exist).
- 01:02 `label-steady` found a real flaw: two labels that compete for the top-left corner swapped
  rows 18 times in 2 s under jitter — the tie was decided by positions that differ by 1e-13 px.
  Fix: the order of two competing blocks is decided by their unpushed places with a 0.5 px margin
  and is held while the pose moves (history, cleared by `seek` and when the pose rests).
- 01:10 A harness edit during a run reloaded the page under the `flash` check (Vite full reload)
  and failed it. Rule from here: no edits to served files while checks run.
- 01:21 S2 committed as `73ce561`. Its message says "45 tests"; the count is 48 (24 per browser).

## S3 — the whole event (01:22–)

- Everything S3 names was already drawn at S2 (all sheets, guides, the red line, the host zoom-out);
  S3 is the looking and the checks: `distance-label`, `motion`, `unanchored` green in both browsers
  at their first run (01:19).
- 01:23 Looks: the wall in flight was an opaque dark slab until it settled (print density followed
  the travel); it now follows only "behind the phone". In `assemble` three sheets vanished for
  0.2 s: the landing overshoots (`backOut`), a sheet dips below its neighbour, and the depth sort put
  the opaque background over it. `assemble` now sorts by stack index alone.
- 01:24 `perf` in WebKit (Apple GPU) under the lock: scene 0 ms median, 1 ms p95 in every timeline
  and tier (WebKit's clock has 1 ms steps); texture memory 17.52 / 9.88 / 4.41 MB against budgets of
  64 / 40 / 24 MB; bundle 92.3 kB (29.3 kB gzip). Lock waited 0 s; port 5275 was listening.
- 01:25–01:32 Full run: 48 passed (Chromium and WebKit) in 7.0 min. S3 committed as `9f0af72` (01:32).

## S4 — unanchored, the suck-back, rebuild (01:32–)

- The three paths were drawn since S2; S4 looked at each as a strip of frames.
- 01:35 Host `rebuild`, t = 1.0 s: the mark and the text were gone for half a second. A lifting print
  was drawn above every other print (peel's rule, right when layers leave top-down). In spill the
  layers that go behind the phone leave first and land last, so the background landed on top of
  everything; in `depart` it covered the mark while it left. Prints now keep their stack order
  while they lift. No check had seen it: the end frames were exact.
- 01:34 The red line is a tape: a tick every 10 cm (longer every 50 cm), placed on the line in space
  between the phone's foot and a point 0.6 units in front of the camera, so they spread towards the
  guest. The pose filter keeps the scene drawing until it has converged after the last pose.
- 01:34 `contract` also mounts two other manifests (four flying layers; no full-bleed layer, whose
  bottom layer becomes a 6-wide wall) and runs them through `explode`, `fly`, `assemble`.
- 01:36 Dev server restarted with `SPILL_CONTENT_DIR` (the owner's card, served at `/content/`);
  first looks at it written to `~/dev/prv/products/layercard-runs/spill-v4-eryk/`. Seven flying
  layers, two with the same rect: the room layout needed no change.
- 01:37–01:48 Full run with the sixteen contact sheets rendering beside it: 48 passed in 10.2 min.
  S4 committed as `0b0aec1` (01:48).

## S5 — owner's card, artifacts, perf, report (01:48–)

- 01:44 The dolly film in Playwright's Chromium (software GL) rendered 28 frames in 100 s; stopped.
  In WebKit (GPU): 239 frames in 55 s. Both films are rendered with `SPILL_BROWSER=webkit`, under
  the GPU lock: `artifacts/spill-v4-dolly.mp4` (361 frames, 12.0 s), `artifacts/spill-v4-sequence.mp4`
  (442 frames, 14.7 s).
- 01:51–01:53 The owner's card, outside the repo (`~/dev/prv/products/layercard-runs/spill-v4-eryk/`):
  dolly film, sequence film, sixteen contact sheets.
- 01:54–01:56 `label-steady`, orbit: two frames of 240 had two blocks overlapping while they swapped
  places. A block that has to pass another is now not drawn while they overlap. First rule (closer
  than the 4 px gap) hid a block in 62–73 frames of 240, because neighbours rest exactly 4 px
  apart; with true overlap: 0 overlapping frames, 12 frames with a block giving way, none under
  jitter alone.
- 01:57 Restarting the final run, the first chain of commands survived its kill for 17 s and
  started `perf` under the lock while the suite ran. Both killed, the lock released, the run
  started again from zero.
- 01:57–02:07 Final run on the `dist/` built at 01:57 (no source, check or demo file edited while
  it ran): all checks except `perf` in Chromium (software GL) and WebKit — 48 passed in 5.3 min;
  `perf` in both under the lock — 2 passed in 2.2 min; Chromium on Metal — 24 passed in 54 s, its
  `perf` under the lock — 1 passed in 1.1 min. Logs: `artifacts/tmp/final-{a,b,c,d}.log`.
- `perf` (lock waited 0 s and was held each time; port 5275 was listening each time). Scene time
  per frame, largest over the timelines and tiers: WebKit (Apple GPU) 1 ms median, 3 ms p95, worst
  frame outside `idle` 15 ms (host `depart` at `low`); Chromium on Metal (Apple M3) 0.8 ms median,
  1.2 ms p95, worst 3 ms, 16.7 ms between frames throughout; Chromium headless shell (software GL)
  recorded, not judged. Texture memory 17.52 / 9.88 / 4.41 MB; bundle 93.8 kB (29.9 kB gzip).
- 02:07–02:12 Both films rendered again from the final code (WebKit, under the lock), then the
  owner's two outside the repo. The sequence film has the same size to the byte as the 01:51
  render (1,336,656); the dolly film differs (the frames where a label gives way).
- Result files of the two removed checks (`chrome.json`, `leaders-grid-*.json`) deleted from
  `checks/results/chromium` and `checks/results/webkit`. `checks/results/chromium-metal/` added.
- 02:12 `REPORT.md` written; S5 committed.

## After the run — the owner's first look (16 Nov, 10:08–)

- 10:08 The owner: at some point the sheet with the name goes below the screen and stays there for
  a long time.
- 10:13 Measured on the owner's card with a scratch script (`artifacts/tmp/measure-visible.mjs`,
  not in git): the share of every sheet's area inside the frame, every 0.1 s, eight cameras. From
  30 cm on the axis the name sheet showed 27 % at the end of `explode` and less than half for
  3.6 s of the event; the rows under it 0 %; from 40 cm 62 %, from 47 cm 69 %. Three frames of the
  night's dolly film (3.5, 5.0, 5.9 s; camera at 30 cm) show the second line of the name under
  the bottom edge.
- Cause: `layoutRoom` stepped sheets towards the guest by stack order (0.55–2.2 card widths). At
  30 cm the frame is 2.6 card widths high from the phone's axis at the phone, 1.75 at a sheet
  1.4 in front of it; the name row reached to 2.4.
- 10:15 `src/room.ts`: a row comes towards the guest as far as it fits the frame from 30 cm
  (`FIT_CM`, half field 30°, margin 0.94), between `FLOAT_Z0` 0.2 and `FLOAT_Z1` 1.6; sheets of one
  row 0.14 apart. Example card: mark 0.2, name 0.54, role 0.2, contact 0.2 (were 0.55, 1.1, 1.65,
  2.2). Name sheet on the owner's card from 30 cm: 62 %, cut only at its right end.
- 10:17 Looking at the result: the name was now in the frame with two chips on it — the distance
  label (on the middle of the red line) and the label of the row below (hung past its sheet's inner
  end). `src/layout.ts`: a label hangs at the outer end of its sheet's visible top edge, above the
  highest point of that edge along the label's width. `src/effect.ts`: the distance label is pinned
  on the line's start, across the phone's foot, kept inside the canvas.
- 10:22 `ROW_GAP` 0.45 -> 0.25 -> 0.35. At 0.25 a label of a sheet cut by the bottom edge stood on
  the row above; 0.35 is what a label block (42 px) needs from 40 cm.
- 10:24 `room-scale` measures A26 (the row next below the phone inside the frame top to bottom at
  16 poses: 1.0 everywhere; labels on other sheets: none at the 8 poses on the phone's horizon and
  the standard pose, one at 5 pitched poses). `distance-label` asserts the label on the line's start.
- 10:24–10:34 Full run on the `dist/` of 10:24: 48 passed (4.9 min); `perf` 2 passed (2.3 min);
  Chromium on Metal 24 passed (56 s), its `perf` 1 passed (1.1 min). Steady room: 0.593 px p95
  (was 0.655), sheet-corner lag 10.7 px at most (was 14.7). Labels under jitter from 30 cm:
  0.44 px p95 (was 0); `LABEL_DEAD` 3 instead of 2 did not change it (0.444) and was put back.
  `perf`: WebKit 1 ms median / 2 ms p95 in the moving timelines, Chromium on Metal 0.5 / 1.2 ms;
  in `idle` right after mount WebKit had 6 ms p95 at `high` (3 ms at night). The Mac was busy with
  other work (load average 14–29, three Blender processes, another Playwright Chrome).
- 10:35–10:45 Films and the sixteen contact sheets rendered again (WebKit, under the lock). The
  first chain of renders was stopped after the two films (my own processes; lock released) and
  started again in another order, so that the repo's contact sheets came before the owner's set,
  which is rendered outside the repo after the commit. `process/s6-*.jpg` added. The sheets are
  WebKit's this time (the night's were Chromium's): the same 1474 x 1116 px, 5.5 MB for sixteen
  instead of 3.6 MB, none over 410 kB.
- 10:40–10:45 `dist/` built again at 10:34 from the same source (same 94.53 kB); the four specs
  with production-bundle tests run on it: 14 passed in both browsers.
- 10:45 REPORT, SPEC (A26), CLAUDE.md brought up to the change; committed.
